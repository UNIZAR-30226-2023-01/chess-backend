import { Server, Socket } from 'socket.io'
import {
  PlayerColor, EndState, /* GameDocument, */
  GameState /* GameModel, */
} from '@models/game'
import * as gameCtl from '@lib/game'
import { chessTimers } from '@lib/timer'
import { Chess } from 'chess.ts'
import * as competitive from '@controllers/competitive_game'
import {
  GameOverMessage, MoveMessage,
  MoveResponse, RoomMessage
} from '@lib/messages.types'

export const findGame = competitive.findGame

export const surrender = async (
  socket: Socket,
  io: Server,
  data: RoomMessage
): Promise<void> => {
  if (!data.roomID) {
    socket.emit('error', 'Missing parameters')
    return
  }

  let exit = false
  const roomID: string = data.roomID
  const game = await gameCtl.getGame(roomID, async (game: GameState) => {
    if (game.finished) {
      socket.emit('error', 'Game has already been finished')
      exit = true
      return
    }

    if (game.light_socket_id !== socket.id &&
      game.dark_socket_id !== socket.id) {
      socket.emit('error', 'You are not a player of this game')
      exit = true
      return
    }

    const color = socket.id === game.light_socket_id
      ? PlayerColor.LIGHT
      : PlayerColor.DARK
    game.winner = color === PlayerColor.DARK
      ? PlayerColor.LIGHT
      : PlayerColor.DARK

    if (color === PlayerColor.DARK) {
      game.dark_surrended = true
    } else {
      game.light_surrended = true
    }

    game.finished = true
    game.end_state = EndState.SURRENDER

    if (game.use_timer) {
      const gameTimer = chessTimers.get(roomID)
      if (!gameTimer) {
        socket.emit('error', 'Internal server error')
        exit = true
        return
      }
      game.timer_dark = gameTimer.getTimeDark()
      game.timer_light = gameTimer.getTimeLight()
    }

    await gameCtl.setGame(roomID, game, true)
  })
  if (exit) return

  if (!game) {
    socket.emit('error', `No game with roomID: ${roomID}`)
    return
  }

  if (!game.winner || !game.end_state) {
    socket.emit('error', 'Internal server error')
    return
  }

  const message: GameOverMessage = {
    winner: game.winner,
    end_state: game.end_state
  }

  void gameCtl.endProtocol(io, roomID, game)

  io.to(roomID).emit('game_over', message)
}

export const move = async (
  socket: Socket,
  io: Server,
  data: MoveMessage
): Promise<void> => {
  console.log('move', data)

  const roomID = data.roomID
  let move = data.move

  if (!(roomID && move)) {
    socket.emit('error', 'Missing parameters')
    return
  }

  let exit = false
  const game = await gameCtl.getGame(roomID, async (game: GameState) => {
    if (game.finished) {
      socket.emit('error', 'Game has already been finished')
      exit = true
      return
    }
    if (game.light_socket_id !== socket.id &&
      game.dark_socket_id !== socket.id) {
      socket.emit('error', 'You are not a player of this game')
      exit = true
      return
    }
    if ((game.dark_socket_id === socket.id &&
        game.turn === PlayerColor.LIGHT) ||
      (game.light_socket_id === socket.id &&
        game.turn === PlayerColor.DARK)) {
      socket.emit('error', 'It is not your turn')
      exit = true
      return
    }

    const chess = new Chess(game.board)
    const moveRes = chess.move(move, { sloppy: true })
    if (moveRes === null) {
      socket.emit('error', 'Illegal move')
      exit = true
      return
    }

    if (game.use_timer) {
      // Switch timers
      const gameTimer = chessTimers.get(roomID)
      if (!gameTimer) {
        socket.emit('error', 'Internal server error')
        exit = true
        return
      }

      gameTimer.switchCountDown()
      game.timer_dark = gameTimer.getTimeDark()
      game.timer_light = gameTimer.getTimeLight()
    }

    if (chess.inCheckmate()) {
      game.end_state = EndState.CHECKMATE
      game.winner = game.turn
    } else if (chess.inDraw()) {
      game.end_state = EndState.DRAW
    } else {
      game.finished = false
    }

    game.board = chess.fen()
    game.turn = game.turn === PlayerColor.DARK
      ? PlayerColor.LIGHT
      : PlayerColor.DARK

    if (moveRes.promotion) {
      move = moveRes.from + moveRes.to + moveRes.promotion
    } else {
      move = moveRes.from + moveRes.to
    }
    game.moves.push(move)

    await gameCtl.setGame(roomID, game, game.finished)
  })
  if (exit) return

  if (!game) {
    socket.emit('error', `No game with roomID: ${roomID}`)
    return
  }

  const returnMessage: MoveResponse = {
    move,
    turn: game.turn,
    finished: game.finished
  }

  if (game.finished) {
    returnMessage.end_state = game.end_state
    if (game.end_state === EndState.CHECKMATE) {
      returnMessage.winner = game.winner
    }

    void gameCtl.endProtocol(io, roomID, game)
  }

  if (game.use_timer) {
    returnMessage.timer_dark = game.timer_dark
    returnMessage.timer_light = game.timer_light
  }

  io.to(roomID).emit('move', returnMessage)
}
