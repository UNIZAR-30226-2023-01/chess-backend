import { Chess } from 'chess.ts'
import { Server, Socket } from 'socket.io'
import {
  /* GameType, */ PlayerColor, EndState /* GameDocument, */
  /* GameState, GameModel, newBoard */
} from '../models/game'
import * as competitive from './competitive_game'
import { client } from '../../config/database'

interface Message {
  jugador: string // socket.jugador (temporal para testing)
  roomID: string
  move: string
}

interface MoveMessage {
  roomID: string
  move: string
}

interface MoveResponse {
  timer_dark?: number
  timer_light?: number

  move: string
  turn: PlayerColor
  finished: boolean
  check: boolean
  end_state?: EndState
  winner?: PlayerColor
}

export const roomPrefix = 'game-'

export const findGame = competitive.findGame

export const createRoom = async (socket: Socket, data: Message): Promise<void> => {
  console.log('create_room', JSON.stringify(data))
  await socket.join(data.roomID)
}

export const joinRoom = async (socket: Socket, io: Server, data: Message): Promise<void> => {
  console.log(io.sockets.adapter.rooms)
  if (io.sockets.adapter.rooms.get(data.roomID) === undefined) return

  console.log('join_room', data.roomID)
  await socket.join(data.roomID)
}

export const leaveRoom = async (socket: Socket, data: Message): Promise<void> => {
  console.log('leave_room', data.roomID)
  await socket.leave(data.roomID)
}

export const move = async (socket: Socket, data: MoveMessage): Promise<void> => {
  console.log('move', data)

  const { roomID, move } = data

  if (!(roomID && move)) {
    socket.to(roomID).emit('error', 'Missing parameters')
    return
  }

  const rawGame = await client.get(roomPrefix + roomID)
  if (!rawGame) {
    socket.to(roomID).emit('error', 'Not such room')
    return
  }

  const game = JSON.parse(rawGame)

  if (game.light_socket_id !== socket.id &&
    game.dark_socket_id !== socket.id) {
    socket.emit('error', 'No eres jugador de esta partida')
    return
  }
  if ((game.dark_socket_id === socket.id && game.turn === PlayerColor.LIGHT) ||
      (game.light_socket_id === socket.id && game.turn === PlayerColor.DARK)) {
    socket.emit('error', 'No es tu turno')
    return
  }

  const chess = new Chess(game.board)
  const moveRes = chess.move(move, { sloppy: true })
  if (moveRes === null) {
    socket.emit('error', 'Movimiento ilegal')
    return
  }

  // Cancelar avance de tiempo

  let flag: EndState | undefined
  let finished = true
  if (chess.inCheckmate()) flag = EndState.CHECKMATE
  else if (chess.inDraw()) flag = EndState.DRAW
  else finished = false

  const check = chess.inCheck()

  const winner = game.turn

  game.board = chess.fen()
  game.turn = game.turn === PlayerColor.DARK ? PlayerColor.LIGHT : PlayerColor.DARK
  game.moves.push(move)

  await client.set(roomPrefix + roomID, JSON.stringify(game))

  const returnMessage: MoveResponse = {
    move,
    turn: game.turn,
    finished,
    check
  }

  if (finished) {
    returnMessage.end_state = flag
    if (flag === EndState.CHECKMATE) {
      returnMessage.winner = winner
    }
  }

  if (game.use_timer) {
    returnMessage.timer_dark = game.timer_dark
    returnMessage.timer_light = game.timer_light
  }

  socket.to(roomID).emit('move', returnMessage)
  socket.emit('move', returnMessage)

  // Avance de tiempos
}
