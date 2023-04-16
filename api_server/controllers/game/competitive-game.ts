import { Socket } from 'socket.io'
import * as matchmaking from '@lib/matchmaking'
import { chessTimers, ChessTimer } from '@lib/timer'
import * as gameLib from '@lib/game'
import { FindRoomMsg } from '@lib/types/socket-msg'
import { GameState, GameType, PlayerColor, START_BOARD } from '@lib/types/game'
import { Types } from 'mongoose'
import { UserModel } from '@models/user'
import { io } from '@server'
const _ = require('lodash')

const initialTimes = [3 * 60, 5 * 60, 10 * 60] // seconds
const increments = [0, 0, 0] // seconds

export const findGame = async (
  socket: Socket,
  data: FindRoomMsg
): Promise<void> => {
  if (!data.time) {
    socket.emit('error', 'Missing parameters')
    return
  }

  if (!socket.data.authenticated) {
    socket.emit('error', 'Must be authenticated to find a game')
    return
  }

  const index = _.indexOf(initialTimes, data.time)
  if (index === -1) {
    socket.emit('error', 'Specified time is not available')
    return
  }

  const increment = increments[index]

  console.log('Matching...')

  const match = await matchmaking
    .findCompetitiveGame(socket.data.userID, data.time, socket)

  if (!match.player1 || !match.socket1) {
    socket.emit('error', 'Internal server error')
    return
  }

  await socket.join(match.roomID)
  if (!match.player2 || !match.socket2) return // jugador que espera

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

  console.log(game)

  const roomID = match.roomID.toString()
  await gameLib.setGame(roomID, game)
  await gameLib.newGameInDB(game, roomID)
  await gameLib.startGameInDB(game, roomID)

  const res1 = gameLib.createFoundRoomMsg(match.socket1, roomID, game)
  const res2 = gameLib.createFoundRoomMsg(match.socket2, roomID, game)

  io.to(match.socket1).emit('room', res1)
  io.to(match.socket2).emit('room', res2)

  const gameTimer = new ChessTimer(
    data.time * 1000,
    increment * 1000,
    gameLib.timeoutProtocol(roomID)
  )

  chessTimers.set(match.roomID, gameTimer)
}
