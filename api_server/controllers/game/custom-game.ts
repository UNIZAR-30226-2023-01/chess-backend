import * as gameLib from '@lib/game'
import { FindRoomMsg } from '@lib/types/socket-msg'
import { Socket } from 'socket.io'
import * as roomLib from '@lib/room'
import * as error from '@lib/socket-error'
import { GameState, GameType, PlayerColor, START_BOARD } from '@lib/types/game'
import { ChessTimer, chessTimers } from '@lib/timer'
import { ReservedUsernames, UserModel } from '@models/user'
import { io } from '@server'
import { Types } from 'mongoose'
import { GameModel } from '@models/game'

/**
 * Creates a custom game with the given configuration or
 * joins a game if the `data` object contains a room id.
 *
 * @param socket Socket connexion of the player.
 * @param data Game configuration or room id of the game to join.
 */
export const findGame = async (
  socket: Socket,
  data: FindRoomMsg
): Promise<void> => {
  if (data.roomID) {
    await joinGame(socket, data.roomID)
    return
  }

  const check = gameLib.checkRoomCreationMsg(data)
  if (check.error) {
    socket.emit('error', error.invalidParams(check.error))
    return
  }

  await createGame(socket, data, check.useTimer)
}

/**
 * Creates a custom game with the given configuration.
 *
 * @param socket Authenticated socket connexion of the player.
 * @param data Game configuration or room id of the game to join.
 * @param useTimer Set to true if the game uses a timer.
 */
const createGame = async (
  socket: Socket,
  data: FindRoomMsg,
  useTimer: boolean
): Promise<void> => {
  if (!socket.data.authenticated) {
    socket.emit('error', error.mustBeAuthenticated())
    return
  }

  // ---- End of validation ---- //

  const roomID = await roomLib.generateUniqueRoomCode()

  let darkSocketId = ''
  let lightSocketId = ''
  let darkId, lightId: Types.ObjectId | undefined
  if (data.hostColor === PlayerColor.DARK) {
    darkSocketId = socket.id
    darkId = socket.data.userID
  } else {
    lightSocketId = socket.id
    lightId = socket.data.userID
  }

  const game: GameState = {
    turn: PlayerColor.LIGHT,
    darkSocketId,
    lightSocketId,
    darkId,
    lightId,

    dark: '',
    light: '',
    board: START_BOARD,
    moves: [],

    useTimer,
    initialTimer: data.time,
    timerIncrement: data.increment,
    timerDark: data.time ? data.time * 1000 : undefined,
    timerLight: data.time ? data.time * 1000 : undefined,

    finished: false,
    endState: undefined,
    winner: undefined,

    spectators: [],

    darkVotedDraw: false,
    lightVotedDraw: false,

    darkVotedSave: false,
    lightVotedSave: false,

    darkSurrended: false,
    lightSurrended: false,

    gameType: GameType.CUSTOM
  }

  await gameLib.setGame(roomID, game)
  await gameLib.newGameInDB(game, roomID)

  await socket.join(roomID)

  socket.emit('room_created', { roomID })
}

/**
 * Fills the player-related properties of the game and
 * binds the socket id to the game object.
 *
 * Unauthenticated players are named as **guest** users.
 *
 * @param socket Socket connexion of the player.
 * @param game Game object with the properties to be changed.
 */
export const completeUserInfo = async (
  socket: Socket,
  game: GameState
): Promise<void> => {
  if (game.darkId?.equals(socket.data.userID)) {
    game.dark = (await UserModel.findById(game.darkId))?.username ??
      ReservedUsernames.GUEST_USER
    game.light = ''
    game.darkSocketId = socket.id
    game.lightSocketId = ''
  } else {
    game.light = (await UserModel.findById(game.lightId))?.username ??
      ReservedUsernames.GUEST_USER
    game.dark = ''
    game.lightSocketId = socket.id
    game.darkSocketId = ''
  }
}

/**
 * Joins a custom game with the given room id.
 *
 * @param socket Socket connexion of the player.
 * @param data Object containing the room id of the game to join.
 */
const joinGame = async (
  socket: Socket,
  roomID: string
): Promise<void> => {
  let darkSocket: Socket, lightSocket: Socket

  const game = await gameLib.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error', error.notPlaying())
      return
    }

    if (game.finished) {
      socket.emit('error', error.gameAlreadyFinished())
      return
    }

    if (game.darkId !== undefined &&
        game.lightId !== undefined &&
        !socket.data.authenticated) {
      socket.emit('error', error.notPlayerOfThisGame())
      return
    }

    if ((socket.data.userID?.equals(game.darkId) && game.darkSocketId !== '') ||
        (socket.data.userID?.equals(game.lightId) && game.lightSocketId !== '')) {
      socket.emit('error', error.alreadyJoined())
      return
    }

    if (game.darkSocketId === '' && game.lightSocketId !== '') {
      game.darkSocketId = socket.id
    } else if (game.lightSocketId === '' && game.darkSocketId !== '') {
      game.lightSocketId = socket.id
    } else {
      socket.emit('error', error.gameNotReady('This game is not ready to join.'))
      return
    }

    const _darkSocket = io.sockets.sockets.get(game.darkSocketId)
    const _lightSocket = io.sockets.sockets.get(game.lightSocketId)

    if (!_darkSocket || !_lightSocket) {
      socket.emit('error', error.internalServerError())
      return
    }

    // ---- End of validation ---- //

    darkSocket = _darkSocket
    lightSocket = _lightSocket

    if (darkSocket.data.authenticated) game.darkId = darkSocket.data.userID
    if (lightSocket.data.authenticated) game.lightId = lightSocket.data.userID

    game.dark = (await UserModel.findById(game.darkId))
      ?.username ?? ReservedUsernames.GUEST_USER
    game.light = (await UserModel.findById(game.lightId))
      ?.username ?? ReservedUsernames.GUEST_USER

    await gameLib.setGame(roomID, game)
    return game
  })
  if (!game) return

  const resDark = gameLib.createFoundRoomMsg(game.darkSocketId, roomID, game)
  const resLight = gameLib.createFoundRoomMsg(game.lightSocketId, roomID, game)

  io.to(game.darkSocketId).emit('room', resDark)
  io.to(game.lightSocketId).emit('room', resLight)

  await socket.join(roomID)

  if (game.useTimer && game.timerIncrement !== undefined &&
      game.timerLight !== undefined && game.timerDark !== undefined) {
    const gameTimer = new ChessTimer(
      game.turn,
      game.timerLight,
      game.timerDark,
      game.timerIncrement * 1000,
      gameLib.timeoutProtocol(roomID)
    )

    chessTimers.set(roomID, gameTimer)
  }

  await gameLib.startGameInDB(game, roomID)
}

/**
 * Cancels a custom game with the given room id if it hasn't been started yet.
 *
 * @param socket Authenticated socket connexion of the player.
 * @param roomID Identifier of the room where the game is allocated.
 */
export const cancelCreation = async (
  socket: Socket,
  roomID: string
): Promise<void> => {
  const game = await gameLib.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error', error.notPlaying())
      return
    }

    if (gameLib.isGameStarted(game)) {
      socket.emit('error', error.gameAlreadyStarted())
      return
    }

    // ---- End of validation ---- //

    await gameLib.unsetGame(roomID)
    return game
  })
  if (!game) return

  await GameModel.remove({ roomID })
  socket.emit('cancelled')
  await socket.leave(roomID)
}
