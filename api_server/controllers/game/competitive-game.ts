import { Socket } from 'socket.io'
import * as matchmaking from '@lib/matchmaking'
import { chessTimers, ChessTimer } from '@lib/timer'
import * as gameLib from '@lib/game'
import * as roomGen from '@lib/room'
import * as error from '@lib/socket-error'
import { FindRoomMsg } from '@lib/types/socket-msg'
import { GameState, GameType, PlayerColor, START_BOARD } from '@lib/types/game'
import { Types } from 'mongoose'
import { UserModel } from '@models/user'
import { io } from '@server'
import { ResourceName } from '@lib/namespaces'
import _ from 'lodash'

/** All possible times in **seconds** for a competitive game. */
const initialTimes = [3 * 60, 5 * 60, 10 * 60] // seconds

/** All possible increments in **seconds** for a competitive game. */
const increments = [0, 0, 0] // seconds

/**
 * Finds an opponent for the player to play a competitive game.
 * This function does not end until the matchmaking is
 * completed or cancelled.
 *
 * @param socket Authenticated socket connexion of the player.
 * @param data Game configuration.
 */
export const findGame = async (
  socket: Socket,
  data: FindRoomMsg
): Promise<void> => {
  if (!data.time) {
    socket.emit('error', error.invalidParams('Missing parameters.'))
    return
  }

  if (!socket.data.authenticated) {
    socket.emit('error', error.mustBeAuthenticated())
    return
  }

  const index = _.indexOf(initialTimes, data.time)
  if (index === -1) {
    socket.emit('error', error.invalidParams('Specified time is not available.'))
    return
  }

  // ---- End of validation ---- //

  const increment = increments[index]

  // Temporary room not to let the socket find another game
  await socket.join(ResourceName.PLAYER_Q)

  const match = await matchmaking
    .findCompetitiveGame(socket.data.userID, data.time, socket)

  if (match.cancelled) {
    await cancelSearch(socket, ResourceName.PLAYER_Q)
    return
  }

  if (!match.baton) return // Only the baton can create the room

  // ---- End of matchmaking ---- //

  const roomID = await roomGen.generateUniqueRoomCode()

  let darkId, lightId: Types.ObjectId
  let darkSocketId: string, lightSocketId: string
  if (Math.random() >= 0.5) {
    darkId = match.player1
    lightId = match.player2
    darkSocketId = match.socket1
    lightSocketId = match.socket2
  } else {
    darkId = match.player2
    lightId = match.player1
    darkSocketId = match.socket2
    lightSocketId = match.socket1
  }

  const game: GameState = {
    turn: PlayerColor.LIGHT,
    darkSocketId,
    lightSocketId,
    darkId,
    lightId,

    dark: (await UserModel.findById(darkId))?.username ?? 'ErrorUser',
    light: (await UserModel.findById(lightId))?.username ?? 'ErrorUser',
    board: START_BOARD,
    moves: [],

    useTimer: true,
    initialTimer: data.time,
    timerIncrement: increment,
    timerDark: data.time * 1000,
    timerLight: data.time * 1000,

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

    gameType: GameType.COMPETITIVE
  }

  await gameLib.setGame(roomID, game)
  await gameLib.newGameInDB(game, roomID)
  await gameLib.startGameInDB(game, roomID)

  const res1 = gameLib.createFoundRoomMsg(match.socket1, roomID, game)
  const res2 = gameLib.createFoundRoomMsg(match.socket2, roomID, game)

  io.in(match.socket1).socketsJoin(roomID)
  io.in(match.socket2).socketsJoin(roomID)

  io.in(match.socket1).socketsLeave(ResourceName.PLAYER_Q)
  io.in(match.socket2).socketsLeave(ResourceName.PLAYER_Q)

  io.to(match.socket1).emit('room', res1)
  io.to(match.socket2).emit('room', res2)

  const gameTimer = new ChessTimer(
    game.turn,
    data.time * 1000,
    data.time * 1000,
    increment * 1000,
    gameLib.timeoutProtocol(roomID)
  )

  chessTimers.set(roomID, gameTimer)
}

/**
 * Cancels the search of a competitive game.
 *
 * @param socket Authenticated socket connexion of the player.
 * @param roomID Identifier of the room where the game is allocated.
 */
export const cancelSearch = async (
  socket: Socket,
  roomID: string
): Promise<void> => {
  socket.emit('cancelled')
  await gameLib.unsetGame(roomID)
  await socket.leave(roomID)
}
