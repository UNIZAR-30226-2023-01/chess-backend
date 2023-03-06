import { Chess } from 'chess.ts'
import { Server, Socket } from 'socket.io'
import {
  /* GameType, */ PlayerColor, EndState, /* GameDocument, */
  GameState /* , GameModel, newBoard */
} from '../models/game'
import * as competitive from './competitive_game'
import { client, redlock } from '../../config/database'
import { chessTimers } from '../../lib/timer'

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

// 2 minutes after a game is over, it is deleted from redis
export const gameOverTTL = 2 * 60

export const roomPrefix = 'game-'
export const roomLockPrefix = 'game-lock-'

export const findGame = competitive.findGame

export const createRoom = async (socket: Socket, data: Message): Promise<void> => {
  console.log('create_room', JSON.stringify(data))
  await socket.join(data.roomID)
}

export const gameState = async (socket: Socket, data: Message): Promise<void> => {
  if (!data.roomID) {
    socket.emit('error', 'Missing parameters')
    return
  }

  let game: GameState
  const roomID = data.roomID
  let lock = await redlock.acquire([roomLockPrefix + roomID], 5000) // LOCK
  try {
    const rawGame = await client.get(roomPrefix + roomID)
    if (!rawGame) {
      socket.emit('error', `No game with roomID: ${roomID}`)
      return
    }

    lock = await lock.extend(5000) // EXTEND
    game = JSON.parse(rawGame)

    if (game.use_timer) {
      const gameTimer = chessTimers.get(roomID)
      if (!gameTimer) {
        socket.emit('error', 'Internal server error')
        return
      }
      game.timer_dark = gameTimer.getTimeDark()
      game.timer_light = gameTimer.getTimeLight()
    }

    // TODO: añadir el nombre de los espectadores a la lista... requiere autentificación
    // de momento usamos el socket id...
    game.spectators.push(socket.id)

    await client.setex(roomPrefix + roomID, gameOverTTL, JSON.stringify(game))
  } finally {
    // This block executes even if a return statement is called
    await lock.release() // UNLOCK
  }

  socket.emit('game_state', game)
}

export const joinRoom = async (socket: Socket, io: Server, data: Message): Promise<void> => {
  console.log(io.sockets.adapter.rooms)
  if (!io.sockets.adapter.rooms.get(data.roomID)) return

  await gameState(socket, data)

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

  let lock = await redlock.acquire([roomLockPrefix + roomID], 5000) // LOCK

  let flag: EndState | undefined
  let finished = true
  let check: boolean
  let winner: PlayerColor
  let game: GameState

  try {
    const rawGame = await client.get(roomPrefix + roomID)
    if (!rawGame) {
      socket.to(roomID).emit('error', 'Not such room')
      return
    }

    lock = await lock.extend(5000) // EXTEND

    game = JSON.parse(rawGame)
    if (game.finished) {
      socket.emit('error', 'Game has already been finished')
      return
    }

    if (game.light_socket_id !== socket.id &&
    game.dark_socket_id !== socket.id) {
      socket.emit('error', 'You are not a player of this game')
      return
    }
    if ((game.dark_socket_id === socket.id && game.turn === PlayerColor.LIGHT) ||
      (game.light_socket_id === socket.id && game.turn === PlayerColor.DARK)) {
      socket.emit('error', 'It is not your turn')
      return
    }

    const chess = new Chess(game.board)
    const moveRes = chess.move(move, { sloppy: true })
    if (moveRes === null) {
      socket.emit('error', 'Illegal move')
      return
    }

    if (game.use_timer) {
      // Switch timers
      const gameTimer = chessTimers.get(roomID)
      if (!gameTimer) {
        socket.emit('error', 'Internal server error')
        return
      }

      gameTimer.switchCountDown()
      game.timer_dark = gameTimer.getTimeDark()
      game.timer_light = gameTimer.getTimeLight()
    }

    if (chess.inCheckmate()) flag = EndState.CHECKMATE
    else if (chess.inDraw()) flag = EndState.DRAW
    else finished = false

    check = chess.inCheck()

    winner = game.turn
    game.finished = finished
    game.board = chess.fen()
    game.turn = game.turn === PlayerColor.DARK ? PlayerColor.LIGHT : PlayerColor.DARK
    game.moves.push(move)

    if (finished) {
      if (game.use_timer) {
        const gameTimer = chessTimers.get(roomID)
        if (!gameTimer) {
          socket.emit('error', 'Internal server error')
          return
        }
        gameTimer.stop()
      }
      game.end_state = flag
      await client.setex(roomPrefix + roomID, JSON.stringify(game), gameOverTTL)
    } else {
      await client.set(roomPrefix + roomID, JSON.stringify(game))
    }
  } finally {
    // This block executes even if a return statement is called
    await lock.release() // UNLOCK
  }

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
}
