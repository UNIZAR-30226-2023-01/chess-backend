import { Server, Socket } from 'socket.io'
import {
  GameType, PlayerColor, /* GameDocument, */
  GameState, /* GameModel, */ newBoard
} from '../models/game'
import * as matchmaking from '../../lib/matchmaking'
import { chessTimers, ChessTimer } from '../../lib/timer'
import * as gameCtl from '../../lib/game'
import { FindGameMsg, FoundGameMsg } from '../../lib/messages.types'
import UserModel from '../models/user'
const _ = require('lodash')

const initialTimes = [3 * 60, 5 * 60, 10 * 60] // seconds
const increments = [0, 0, 0] // seconds

export const findGame = async (
  socket: Socket,
  io: Server,



  data: FindGameMsg
): Promise<void> => {
  if (!data.time) {
    socket.emit('error', 'Missing parameters')
    return
  }
  let i = 23
  console.log(i)

  if (!socket.data.authenticated) {
    socket.emit('error', 'Must be authenticated to find a game')
    return
  }

  console.log('rooms:', socket.rooms.values())
  for (const roomID of socket.rooms.values()) {
    const game = await gameCtl.getGame(roomID)
    console.log('roomID: ', roomID)
    console.log('game: ', game)
    if (game && !game.finished) {
      socket.emit('error', 'This socket is already playing or in queue')
      return
    }
  }

  const username = socket.data.username

  const index = _.indexOf(initialTimes, data.time)
  if (index === -1) {
    socket.emit('error', 'Specified time is not available')
    return
  }

  const increment = increments[index]

  console.log('Matching...')

  const match = await matchmaking
    .findCompetitiveGame(username, data.time, socket)

  if (!match.player1 || !match.socket1) {
    socket.emit('error', 'Internal server error')
    return
  }

  await socket.join(match.roomID)
  if (!match.player2 || !match.socket2) return // jugador que espera

  let dark: string, light: string
  let darkSocketId: string, lightSocketId: string
  if (Math.random() >= 0.5) {
    dark = match.player1
    light = match.player2
    darkSocketId = match.socket1
    lightSocketId = match.socket2
  } else {
    dark = match.player2
    light = match.player1
    darkSocketId = match.socket2
    lightSocketId = match.socket1
  }

  const darkUser = await UserModel.findOne({ username: dark })
  const lightUser = await UserModel.findOne({ username: light })
  if (!darkUser || !lightUser) {
    io.to(match.roomID).emit('error', 'Internal server error')
    return
  }

  const game: GameState = {
    turn: PlayerColor.LIGHT,
    dark_socket_id: darkSocketId,
    light_socket_id: lightSocketId,
    dark_id: darkUser._id,
    light_id: lightUser._id,

    dark,
    light,
    board: newBoard,
    moves: [],

    use_timer: true,
    initial_timer: data.time,
    timer_increment: increment,
    timer_dark: data.time * 1000,
    timer_light: data.time * 1000,

    finished: false,
    end_state: undefined,
    winner: undefined,

    spectators: [],

    dark_voted_draw: false,
    light_voted_draw: false,

    dark_voted_save: false,
    light_voted_save: false,

    dark_surrended: false,
    light_surrended: false,

    game_type: GameType.COMPETITIVE
  }

  console.log(game)

  const roomID = match.roomID.toString()
  await gameCtl.setGame(roomID, game)

  const res1 = createFoundGameMsg(match.socket1, roomID, game)
  const res2 = createFoundGameMsg(match.socket2, roomID, game)

  io.to(match.socket1).emit('game_state', res1)
  io.to(match.socket2).emit('game_state', res2)

  const gameTimer = new ChessTimer(
    data.time * 1000,
    increment * 1000,
    gameCtl.timeoutProtocol(io, roomID)
  )

  chessTimers.set(match.roomID, gameTimer)
}

const createFoundGameMsg = (
  playerID: string,
  roomID: string,
  game: GameState
): FoundGameMsg => {
  const msg: FoundGameMsg = Object.assign({
    roomID,
    color: playerID === game.dark_socket_id
      ? PlayerColor.DARK
      : PlayerColor.LIGHT
  }, game)

  return gameCtl.filterGameState(msg)
}
