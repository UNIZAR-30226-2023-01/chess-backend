import { Server, Socket } from 'socket.io'
import * as gameCtl from '@lib/game'
import { chessTimers } from '@lib/timer'
import { Chess } from 'chess.ts'
import { GameOverMsg, MovedMsg } from '@lib/types/socket-msg'
import { PlayerColor, EndState } from '@lib/types/game'

export const surrender = async (
  socket: Socket,
  io: Server,
  roomID: string
): Promise<void> => {
  const game = await gameCtl.getGame(roomID, async (game) => {
    if (!game) { // TODO: Internal server error
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

    if (!gameCtl.updateGameTimer(roomID, game)) {
      socket.emit('error', 'Internal server error')
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

  io.to(roomID).emit('game_over', message)
  await gameCtl.endProtocol(io, roomID, game)
}

export const voteDraw = async (
  socket: Socket,
  io: Server,
  roomID: string
): Promise<void> => {
  const game = await gameCtl.getGame(roomID, async (game) => {
    if (!game) { // TODO: Internal server error
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

    if (color === PlayerColor.DARK) {
      game.darkVotedDraw = true
    } else {
      game.lightVotedDraw = true
    }

    if (game.darkVotedDraw && game.lightVotedDraw) {
      game.finished = true
      game.endState = EndState.DRAW
    }

    if (!gameCtl.updateGameTimer(roomID, game)) {
      socket.emit('error', 'Internal server error')
    }

    await gameCtl.setGame(roomID, game, true)
    return game
  })
  if (!game) return

  if (game.finished) {
    if (!game.endState) {
      socket.emit('error', 'Internal server error')
      return
    }

    const message: GameOverMsg = {
      endState: game.endState
    }

    io.to(roomID).emit('game_over', message)
    await gameCtl.endProtocol(io, roomID, game)
  }
}

export const move = async (
  socket: Socket,
  io: Server,
  roomID: string,
  move: string
): Promise<void> => {
  console.log('move:', move)

  const game = await gameCtl.getGame(roomID, async (game) => {
    if (!game) { // TODO: Internal server error
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

    game.finished = true
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
    turn: game.turn
  }

  if (game.useTimer) {
    returnMessage.timerDark = game.timerDark
    returnMessage.timerLight = game.timerLight
  }

  io.to(roomID).emit('moved', returnMessage)
  if (game.finished && game.endState) {
    const gameOverMessage: GameOverMsg = {
      endState: game.endState
    }
    if (game.endState === EndState.CHECKMATE) {
      gameOverMessage.winner = game.winner
    }
    io.to(roomID).emit('game_over', gameOverMessage)
    await gameCtl.endProtocol(io, roomID, game)
  }
}
