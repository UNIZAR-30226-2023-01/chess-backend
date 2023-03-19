import { Server, Socket } from 'socket.io'
import * as gameCtl from '@lib/game'
import { chessTimers } from '@lib/timer'
import { Chess } from 'chess.ts'
import {
  GameOverMsg, MoveMsg,
  MovedMsg, RoomIDMsg
} from '@lib/types/socket-msg'
import { PlayerColor, EndState } from '@lib/types/game'

export const surrender = async (
  socket: Socket,
  io: Server,
  data: RoomIDMsg
): Promise<void> => {
  if (!data.roomID) {
    socket.emit('error', 'Missing parameters')
    return
  }

  const roomID: string = data.roomID
  const game = await gameCtl.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error', `No game with roomID: ${roomID}`)
      return
    }

    if (game.finished) {
      socket.emit('error', 'Game has already been finished')
      return
    }

    if (!gameCtl.isPlayerOfGame(socket, game)) {
      socket.emit('error', 'You are not a player of this game')
      return
    }

    const color = gameCtl.getColor(socket, game)
    game.winner = gameCtl.alternativeColor(color)

    if (color === PlayerColor.DARK) {
      game.darkSurrended = true
    } else {
      game.lightSurrended = true
    }

    game.finished = true
    game.endState = EndState.SURRENDER

    if (game.useTimer) {
      const gameTimer = chessTimers.get(roomID)
      if (!gameTimer) {
        socket.emit('error', 'Internal server error')
        return
      }
      game.timerDark = gameTimer.getTimeDark()
      game.timerLight = gameTimer.getTimeLight()
    }

    await gameCtl.setGame(roomID, game, true)
    return game
  })
  if (!game) return

  if (!game.winner || !game.endState) {
    socket.emit('error', 'Internal server error')
    return
  }

  const message: GameOverMsg = {
    winner: game.winner,
    endState: game.endState
  }

  void gameCtl.endProtocol(io, roomID, game)

  io.to(roomID).emit('game_over', message)
}

export const move = async (
  socket: Socket,
  io: Server,
  data: MoveMsg
): Promise<void> => {
  console.log('move', data)

  const roomID = data.roomID
  let move = data.move

  if (!(roomID && move)) {
    socket.emit('error', 'Missing parameters')
    return
  }

  const game = await gameCtl.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error', `No game with roomID: ${roomID}`)
      return
    }

    if (game.finished) {
      socket.emit('error', 'Game has already been finished')
      return
    }

    if (!gameCtl.isPlayerOfGame(socket, game)) {
      socket.emit('error', 'You are not a player of this game')
      return
    }

    const color = gameCtl.getColor(socket, game)
    if (color !== game.turn) {
      socket.emit('error', 'It is not your turn')
      return
    }

    const chess = new Chess(game.board)
    const moveRes = chess.move(move, { sloppy: true })
    if (moveRes === null) {
      socket.emit('error', 'Illegal move')
      return
    }

    if (game.useTimer) {
      // Switch timers
      const gameTimer = chessTimers.get(roomID)
      if (!gameTimer) {
        socket.emit('error', 'Internal server error')
        return
      }

      gameTimer.switchCountDown()
      game.timerDark = gameTimer.getTimeDark()
      game.timerLight = gameTimer.getTimeLight()
    }

    if (chess.inCheckmate()) {
      game.endState = EndState.CHECKMATE
      game.winner = game.turn
    } else if (chess.inDraw()) {
      game.endState = EndState.DRAW
    } else {
      game.finished = false
    }

    game.board = chess.fen()
    game.turn = gameCtl.alternativeColor(game.turn)

    if (moveRes.promotion) {
      move = moveRes.from + moveRes.to + moveRes.promotion
    } else {
      move = moveRes.from + moveRes.to
    }
    game.moves.push(move)

    await gameCtl.setGame(roomID, game, game.finished)
    return game
  })
  if (!game) return

  const returnMessage: MovedMsg = {
    move,
    turn: game.turn,
    finished: game.finished
  }

  if (game.finished) {
    returnMessage.endState = game.endState
    if (game.endState === EndState.CHECKMATE) {
      returnMessage.winner = game.winner
    }

    void gameCtl.endProtocol(io, roomID, game)
  }

  if (game.useTimer) {
    returnMessage.timerDark = game.timerDark
    returnMessage.timerLight = game.timerLight
  }

  io.to(roomID).emit('move', returnMessage)
}
