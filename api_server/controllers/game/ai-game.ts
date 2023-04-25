import * as gameLib from '@lib/game'
import * as roomLib from '@lib/room'
import { bestMove } from '@lib/stockfish'
import { ChessTimer, chessTimers } from '@lib/timer'
import { PlayerColor, GameState, START_BOARD, GameType, EndState } from '@lib/types/game'
import { FindRoomMsg, GameOverMsg, MovedMsg } from '@lib/types/socket-msg'
import { ReservedUsernames, UserModel } from '@models/user'
import { io } from '@server'
import { Chess } from 'chess.ts'
import { Types } from 'mongoose'
import { Socket } from 'socket.io'

const skillLevel = [1, 3, 7, 20]

const randomTimeToThink = (): number => {
  return Math.floor(Math.random() * (1 - 200 + 1) + 500)
}

export const findGame = async (
  socket: Socket,
  data: FindRoomMsg
): Promise<void> => {
  const check = gameLib.checkRoomCreationMsg(data)
  if (check.error) {
    socket.emit('error', check.error)
    return
  }

  if (data.difficulty) {
    if (data.difficulty < 0 || data.difficulty > 3) {
      socket.emit('error', 'Specified difficulty is out of range')
      return
    }
  } else {
    data.difficulty = 1
  }

  const roomID = await roomLib.generateUniqueRoomCode()

  let darkId: Types.ObjectId | undefined
  let lightId: Types.ObjectId | undefined

  if (data.hostColor === PlayerColor.DARK) {
    darkId = socket.data.userID
  } else {
    lightId = socket.data.userID
  }

  const game: GameState = {
    turn: PlayerColor.LIGHT,
    darkSocketId: '',
    lightSocketId: '',
    darkId,
    lightId,

    dark: '',
    light: '',
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

    gameType: GameType.AI,
    difficulty: data.difficulty
  }
  await completeUserInfo(socket, game)
  await gameLib.setGame(roomID, game)
  await gameLib.newGameInDB(game, roomID)
  await startAIGame(socket, game, roomID)
}

export const completeUserInfo = async (
  socket: Socket,
  game: GameState
): Promise<void> => {
  if (game.darkId?.equals(socket.data.userID)) {
    game.dark = (await UserModel.findById(game.darkId))?.username ??
      ReservedUsernames.GUEST_USER
    game.light = ReservedUsernames.AI_USER
    game.darkSocketId = socket.id
    game.lightSocketId = ''
  } else {
    game.light = (await UserModel.findById(game.lightId))?.username ??
      ReservedUsernames.GUEST_USER
    game.dark = ReservedUsernames.AI_USER
    game.lightSocketId = socket.id
    game.darkSocketId = ''
  }
}

export const startAIGame = async (
  socket: Socket,
  game: GameState,
  roomID: string
): Promise<void> => {
  await gameLib.startGameInDB(game, roomID)

  const res = gameLib.createFoundRoomMsg(socket.id, roomID, game)

  socket.emit('room', res)

  await socket.join(roomID)

  if (game.useTimer &&
        game.timerIncrement !== undefined &&
        game.timerLight !== undefined &&
        game.timerDark !== undefined) {
    const gameTimer = new ChessTimer(
      game.turn,
      game.timerLight,
      game.timerDark,
      game.timerIncrement * 1000,
      gameLib.timeoutProtocol(roomID)
    )

    chessTimers.set(roomID, gameTimer)
  }

  if ((game.dark === ReservedUsernames.AI_USER &&
        game.turn === PlayerColor.DARK) ||
      (game.light === ReservedUsernames.AI_USER &&
        game.turn === PlayerColor.LIGHT)) {
    const move = await bestMove(
      game.board,
      skillLevel[game.difficulty ?? 1],
      randomTimeToThink()
    )
    if (move) {
      await moveAI(socket, roomID, move)
    }
  }
}

export const move = async (
  socket: Socket,
  roomID: string,
  move: string,
  aiMove?: boolean
): Promise<void> => {
  // DEBUG
  console.log('move:', move)

  const game = await gameLib.getGame(roomID, async (game) => {
    if (!game) {
      if (!aiMove) socket.emit('error', `No game with roomID: ${roomID}`)
      return
    }

    if (game.finished) {
      if (!aiMove) socket.emit('error', 'Game has already been finished')
      return
    }

    if (!aiMove && !gameLib.isPlayerOfGame(socket, game)) {
      if (!aiMove) socket.emit('error', 'You are not a player of this game')
      return
    }

    let color = gameLib.getColor(socket, game)
    if (aiMove) color = gameLib.alternativeColor(color)
    if (color !== game.turn) {
      if (!aiMove) socket.emit('error', 'It is not your turn')
      return
    }

    const chess = new Chess(game.board)
    const moveRes = chess.move(move, { sloppy: true })
    if (moveRes === null) {
      if (!aiMove) socket.emit('error', 'Illegal move')
      return
    }

    if (game.useTimer) {
      // Switch timers
      const gameTimer = chessTimers.get(roomID)
      if (!gameTimer) {
        if (!aiMove) socket.emit('error', 'Internal server error')
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
    game.turn = gameLib.alternativeColor(game.turn)

    // Unify move format before pushing and emiting it
    if (moveRes.promotion) {
      move = moveRes.from + moveRes.to + moveRes.promotion
    } else {
      move = moveRes.from + moveRes.to
    }
    game.moves.push(move)

    await gameLib.setGame(roomID, game, game.finished)
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

    await gameLib.endProtocol(roomID, game, gameOverMessage)
  }

  // Execute AI's move if game is not over and
  // this move was executed by a player
  if (!aiMove && !game.finished) {
    const move = await bestMove(
      game.board,
      skillLevel[game.difficulty ?? 1],
      randomTimeToThink()
    )
    if (move) {
      await moveAI(socket, roomID, move)
    }
  }
}

const moveAI = async (
  socket: Socket,
  roomID: string,
  bestMove: string
): Promise<void> => {
  await move(socket, roomID, bestMove, true)
}
