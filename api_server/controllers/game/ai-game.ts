import * as gameCtl from '@lib/game'
import * as roomCtl from '@lib/room'
import { bestMove } from '@lib/stockfish'
import { ChessTimer, chessTimers } from '@lib/timer'
import { PlayerColor, GameState, START_BOARD, GameType, EndState } from '@lib/types/game'
import { FindRoomMsg, GameOverMsg, MovedMsg } from '@lib/types/socket-msg'
import { ReservedUsernames, UserModel } from '@models/user'
import { Chess } from 'chess.ts'
import { Types } from 'mongoose'
import { Server, Socket } from 'socket.io'

export const findGame = async (
  socket: Socket,
  io: Server,
  data: FindRoomMsg
): Promise<void> => {
  const check = gameCtl.checkRoomCreationMsg(data)
  if (check.error) {
    socket.emit('error', check.error)
  }

  const roomID = await roomCtl.generateUniqueRoomCode()

  let darkSocketId: string = ReservedUsernames.AI_USER
  let lightSocketId: string = ReservedUsernames.AI_USER

  let darkId: Types.ObjectId | undefined
  let lightId: Types.ObjectId | undefined

  let dark: string = ReservedUsernames.AI_USER
  let light: string = ReservedUsernames.AI_USER

  if (data.hostColor === PlayerColor.DARK) {
    darkSocketId = socket.id
    darkId = socket.data.userID
    dark = (await UserModel.findById(darkId))
      ?.username ?? ReservedUsernames.GUEST_USER
  } else {
    lightSocketId = socket.id
    lightId = socket.data.userID
    light = (await UserModel.findById(lightId))
      ?.username ?? ReservedUsernames.GUEST_USER
  }

  const game: GameState = {
    turn: PlayerColor.LIGHT,
    darkSocketId,
    lightSocketId,
    darkId,
    lightId,

    dark,
    light,
    board: START_BOARD,
    moves: [],

    useTimer: check.useTimer,
    initialTimer: data.time,
    timerIncrement: data.increment,
    timerDark: data.time ? data.time * 1000 : undefined,
    timerLight: data.time ? data.time * 1000 : undefined,

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

    gameType: GameType.AI
  }

  console.log(game)
  await gameCtl.setGame(roomID, game)

  const res = gameCtl.createFoundRoomMsg(socket.id, roomID, game)

  socket.emit('room', res)

  await socket.join(roomID)

  if (game.useTimer &&
        game.timerIncrement !== undefined &&
        game.initialTimer !== undefined) {
    const gameTimer = new ChessTimer(
      game.initialTimer * 1000,
      game.timerIncrement * 1000,
      gameCtl.timeoutProtocol(io, roomID)
    )

    chessTimers.set(roomID, gameTimer)
  }

  // AI starts if player moves dark pieces
  if (data.hostColor === PlayerColor.DARK) {
    const move = await bestMove(game.board, 20, 1500)
    if (move) {
      await moveAI(socket, io, roomID, move)
    }
  }
}

export const move = async (
  socket: Socket,
  io: Server,
  roomID: string,
  move: string,
  aiMove?: boolean
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

    if (!aiMove && !gameCtl.isPlayerOfGame(socket, game)) {
      socket.emit('error', 'You are not a player of this game')
      return
    }

    let color = gameCtl.getColor(socket, game)
    if (aiMove) color = gameCtl.alternativeColor(color)
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

  // Execute AI's move if game is not over and
  // this move was executed by a player
  if (!aiMove && !game.finished) {
    const move = await bestMove(game.board, 20, 1500)
    if (move) {
      await moveAI(socket, io, roomID, move)
    }
  }
}

const moveAI = async (
  socket: Socket,
  io: Server,
  roomID: string,
  bestMove: string
): Promise<void> => {
  await move(socket, io, roomID, bestMove, true)
}
