import { Server, Socket } from 'socket.io'
import {
  GameType, PlayerColor, /* GameDocument, */
  GameState, /* GameModel, */ newBoard
} from '../models/game'
import * as matchmaking from '../../lib/matchmaking'
import { chessTimers, ChessTimer } from '../../lib/timer'
import * as gameCtl from '../../lib/game'
import { FindGameMsg, FoundGameMsg } from '../../lib/messages.types'
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

  // TODO: Descomentar cuando frontend y mobile puedan acceder con token
  /*
  if (!socket.data.authenticated) {
    socket.emit('error', 'Must be authenticated to find a game')
    return
  }
  */

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

  const roomID = match.roomID.toString()
  await gameCtl.setGame(roomID, game)

  const res1: FoundGameMsg = Object.assign({
    roomID,
    color: game.dark_socket_id === socket.id
      ? PlayerColor.DARK
      : PlayerColor.LIGHT
  }, game)
  delete res1.dark_socket_id
  delete res1.light_socket_id

  const res2: FoundGameMsg = Object.assign({
    roomID,
    color: game.dark_socket_id === socket.id
      ? PlayerColor.LIGHT
      : PlayerColor.DARK
  }, game)
  delete res2.dark_socket_id
  delete res2.light_socket_id

  socket.to(match.roomID).emit('game_state', res2)
  socket.emit('game_state', res1)

  const gameTimer = new ChessTimer(
    data.time * 1000,
    increment * 1000,
    gameCtl.timeoutProtocol(io, socket, roomID)
  )

  chessTimers.set(match.roomID, gameTimer)
}
