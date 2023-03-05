// import { Chess } from 'chess.ts'
import { /* Server, */ Socket } from 'socket.io'
import {
  GameType, PlayerColor, /* EndState, GameDocument, */
  GameState, /* GameModel, */ newBoard
} from '../models/game'
import { client } from '../../config/database'
import * as matchmaking from '../../lib/matchmaking'
import { roomPrefix } from './game'
const lodash = require('lodash')

interface FindGameMsg {
  token: Buffer
  time: number
  user: string
}

type FoundGameMsg = GameState & {
  roomID: string
}

const initialTimes = [3, 5, 10]

export const findGame = async (socket: Socket, data: FindGameMsg): Promise<void> => {
  if (!(data.token && data.time && data.user)) {
    socket.emit('error', 'Missing parameters')
    return
  }

  // TODO: Check token and username...

  if (lodash.indexOf(initialTimes, data.time) === -1) {
    socket.emit('error', 'Specified time is not available')
    return
  }

  console.log('Matching...')

  const match = await matchmaking.findCompetitiveGame(data.user, data.time, socket)
  console.log('match.player1: ', match.player1)
  console.log('match.socket1: ', match.socket1)
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

  const game: GameState = {
    turn: PlayerColor.LIGHT,
    dark_socket_id: darkSocketId,
    light_socket_id: lightSocketId,

    dark,
    light,
    board: newBoard,
    moves: [],

    use_timer: true,
    initial_timer: data.time,
    timer_dark: data.time,
    timer_light: data.time,

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

  const name = roomPrefix + match.roomID.toString()
  await client.set(name, JSON.stringify(game))

  const res: FoundGameMsg = Object.assign({ roomID: match.roomID }, game)
  socket.to(match.roomID).emit('game_state', res)
  socket.emit('game_state', res)
}
