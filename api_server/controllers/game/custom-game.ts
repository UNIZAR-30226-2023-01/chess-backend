import * as gameLib from '@lib/game'
import { FindRoomMsg } from '@lib/types/socket-msg'
import { Server, Socket } from 'socket.io'
import * as roomGen from '@lib/room'
import { GameState, GameType, PlayerColor, START_BOARD } from '@lib/types/game'
import { ChessTimer, chessTimers } from '@lib/timer'
import { ReservedUsernames, UserModel } from '@models/user'

export const findGame = async (
  socket: Socket,
  io: Server,
  data: FindRoomMsg
): Promise<void> => {
  if (data.roomID) {
    await joinGame(socket, io, data.roomID)
    return
  }

  const check = gameLib.checkRoomCreationMsg(data)
  if (check.error) {
    socket.emit('error', check.error)
    return
  }

  await createGame(socket, data, check.useTimer)
}

const createGame = async (
  socket: Socket,
  data: FindRoomMsg,
  useTimer: boolean
): Promise<void> => {
  if (!socket.data.authenticated) {
    socket.emit('error', 'Must be authenticated to create a custom game')
    return
  }

  const roomID = await roomGen.generateUniqueRoomCode()

  let darkSocketId: string = ''
  let lightSocketId: string = ''
  if (data.hostColor === PlayerColor.DARK) darkSocketId = socket.id
  else lightSocketId = socket.id

  const game: GameState = {
    turn: PlayerColor.LIGHT,
    darkSocketId,
    lightSocketId,
    darkId: undefined,
    lightId: undefined,

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

  console.log(game)
  await gameLib.setGame(roomID, game)

  await socket.join(roomID)

  socket.emit('room_created', { roomID })
}

const joinGame = async (
  socket: Socket,
  io: Server,
  roomID: string
): Promise<void> => {
  let darkSocket: Socket, lightSocket: Socket

  const game = await gameLib.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error', `No game with roomID: ${roomID}`)
      return
    }

    if (game.finished) {
      socket.emit('error', 'Game has already been finished')
      return
    }

    if (game.darkSocketId === '') {
      game.darkSocketId = socket.id
    } else {
      game.lightSocketId = socket.id
    }

    const _darkSocket = io.sockets.sockets.get(game.darkSocketId)
    const _lightSocket = io.sockets.sockets.get(game.lightSocketId)

    if (!_darkSocket || !_lightSocket) {
      socket.emit('error', 'Internal server error')
      return
    }

    darkSocket = _darkSocket
    lightSocket = _lightSocket

    let darkId: string | undefined
    if (darkSocket.data.authenticated) {
      darkId = darkSocket.data.userID
    }

    let lightId: string | undefined
    if (lightSocket.data.authenticated) {
      lightId = lightSocket.data.userID
    }

    game.dark = (await UserModel.findById(darkId))
      ?.username ?? ReservedUsernames.GUEST_USER
    game.light = (await UserModel.findById(lightId))
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

  if (game.useTimer &&
        game.timerIncrement !== undefined &&
        game.initialTimer !== undefined) {
    const gameTimer = new ChessTimer(
      game.initialTimer * 1000,
      game.timerIncrement * 1000,
      gameLib.timeoutProtocol(io, roomID)
    )

    chessTimers.set(roomID, gameTimer)
  }
}
