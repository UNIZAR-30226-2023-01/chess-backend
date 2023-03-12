// import { Chess } from 'chess.ts'
import { /* Server, */ Socket } from 'socket.io'
import {
  GameType, PlayerColor, EndState, /* GameDocument, */
  GameState, /* GameModel, */ newBoard
} from '../models/game'
import { client, redlock } from '../../config/database'
import * as matchmaking from '../../lib/matchmaking'
import { roomPrefix, gameOverTTL, roomLockPrefix } from './game'
import { chessTimers, ChessTimer } from '../../lib/timer'
const _ = require('lodash')

interface FindGameMsg {
  token: Buffer
  time: number // seconds
  user: string
}

type FoundGameMsg = Partial<GameState> & {
  roomID: string
}

interface GameOverMessage {
  end_state: EndState
  winner: PlayerColor
}

const initialTimes = [20, 3 * 60, 5 * 60, 10 * 60] // seconds
const increments = [0, 3, 5, 10] // seconds

export const findGame = async (socket: Socket, data: FindGameMsg): Promise<void> => {
  if (!(data.token && data.time && data.user)) {
    socket.emit('error', 'Missing parameters')
    return
  }

  // TODO: Check token and username...

  const index = _.indexOf(initialTimes, data.time)
  if (index === -1) {
    socket.emit('error', 'Specified time is not available')
    return
  }

  const increment = increments[index]

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
    increment,
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

  const name = roomPrefix + match.roomID.toString()
  await client.set(name, JSON.stringify(game))

  const res: FoundGameMsg = Object.assign({ roomID: match.roomID }, game)
  delete res.dark_socket_id
  delete res.light_socket_id
  socket.to(match.roomID).emit('game_state', res)
  socket.emit('game_state', res)

  const gameTimer = new ChessTimer(data.time * 1000, increment * 1000,
    async (winner: PlayerColor): Promise<void> => {
      const roomID = match.roomID
      let lock = await redlock.acquire([roomLockPrefix + roomID], 5000) // LOCK
      try {
        const rawGame = await client.get(roomPrefix + roomID)
        if (!rawGame) {
          console.log('No game with roomID:', roomID)
          return
        }

        lock = await lock.extend(5000) // EXTEND
        const game: GameState = JSON.parse(rawGame)

        if (winner === PlayerColor.LIGHT) {
          game.timer_dark = 0
        } else {
          game.timer_light = 0
        }
        game.finished = true
        game.end_state = EndState.TIMEOUT

        await client.setex(roomPrefix + roomID, gameOverTTL, JSON.stringify(game))
      } finally {
        // This block executes even if a return statement is called
        await lock.release() // UNLOCK
      }

      const message: GameOverMessage = {
        winner,
        end_state: EndState.TIMEOUT
      }

      // TODO: guardar en mongo

      chessTimers.delete(roomID)

      socket.to(roomID).emit('game_over', message)
      socket.emit('game_over', message)
    })

  chessTimers.set(match.roomID, gameTimer)
}
