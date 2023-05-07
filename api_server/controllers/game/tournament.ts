import { MatchDocument } from '@models/tournament'
import * as gameLib from '@lib/game'
import { EndState, GameState, GameType, PlayerColor, START_BOARD } from '@lib/types/game'
import { ChessTimer, chessTimers } from '@lib/timer'
import { Types } from 'mongoose'
import { UserModel } from '@models/user'
import * as tournLib from '@lib/tournament'
import * as error from '@lib/socket-error'
import { Socket } from 'socket.io'
import { FindRoomMsg } from '@lib/types/socket-msg'
import { io } from '@server'

export const startMatch = async (
  id: string,
  match: MatchDocument
): Promise<Types.ObjectId | null> => {
  // Coinflip to decide color
  let darkId, lightId: Types.ObjectId
  if (Math.random() >= 0.5) {
    darkId = match.participants[0] ?? undefined
    lightId = match.participants[1] ?? undefined
  } else {
    darkId = match.participants[1] ?? undefined
    lightId = match.participants[0] ?? undefined
  }

  const game: GameState = {
    turn: PlayerColor.LIGHT,
    darkSocketId: '',
    lightSocketId: '',
    darkId,
    lightId,

    dark: (await UserModel.findById(match.participants[1]))?.username ?? 'null',
    light: (await UserModel.findById(match.participants[0]))?.username ?? 'null',
    board: START_BOARD,
    moves: [],

    useTimer: true,
    initialTimer: 300,
    timerIncrement: 5,
    timerDark: 300 * 1000,
    timerLight: 300 * 1000,

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

    gameType: GameType.TOURNAMENT
  }

  await gameLib.setGame(id, game)
  const gameId = await gameLib.newGameInDB(game, id)

  if (!game.darkId || !game.lightId) {
    if (game.lightId) {
      // Light wins
      game.winner = PlayerColor.LIGHT
      game.darkSurrended = true
    } else if (game.darkId) {
      // Dark wins
      game.winner = PlayerColor.DARK
      game.lightSurrended = true
    }
    game.finished = true
    game.endState = EndState.SURRENDER
    await gameLib.setGame(id, game, true)
    await gameLib.endGameInDB(game, id)
    await tournLib.endProtocol(id, game)
  }

  // Past 15 minutes, game ends if not started
  setTimeout(checkAbandon, 15 * 60 * 1000, id)

  return gameId
}

const checkAbandon = async (id: string): Promise<void> => {
  let doubleLoss = false
  let singleLoss = false

  const game = await gameLib.getGame(id, async game => {
    if (!game || game.finished) return
    if (game.darkSocketId === '' && game.lightSocketId === '') {
      doubleLoss = true
      game.finished = true
      game.endState = EndState.DRAW
      await gameLib.setGame(id, game, true)
    } else if (game.darkSocketId !== '' && game.lightSocketId === '') {
      // Dark wins
      singleLoss = true
      game.finished = true
      game.endState = EndState.SURRENDER
      game.winner = PlayerColor.DARK
      await gameLib.setGame(id, game, true)
    } else if (game.darkSocketId === '' && game.lightSocketId !== '') {
      // Light wins
      singleLoss = true
      game.finished = true
      game.endState = EndState.SURRENDER
      game.winner = PlayerColor.LIGHT
      await gameLib.setGame(id, game, true)
    }

    return game
  })
  if (!game) return

  if (doubleLoss) {
    await gameLib.endGameInDB(game, id)
  } else if (singleLoss) {
    await gameLib.endGameInDB(game, id)
    await tournLib.endProtocol(id, game)
    io.socketsLeave(id)
  }
}

export const findGame = async (
  socket: Socket,
  data: FindRoomMsg
): Promise<void> => {
  if (!data.matchID) {
    socket.emit('error',
      error.invalidParams('Missing parameters'))
    return
  }

  const roomID = data.matchID

  if (gameLib.isSocketInGame(socket)) {
    socket.emit('error', error.alreadyPlaying())
    return
  }

  const game = await gameLib.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error',
        error.invalidParams(`No game with matchID: ${roomID}`))
      return
    }

    if (game.finished) {
      socket.emit('error', error.gameAlreadyFinished())
      return
    }

    if (!gameLib.isIdOnGame(socket.data.userID, game)) {
      socket.emit('error', error.notPlayerOfThisGame())
      return
    }

    if ((socket.data.userID?.equals(game.darkId) && game.darkSocketId !== '') ||
        (socket.data.userID?.equals(game.lightId) && game.lightSocketId !== '')) {
      socket.emit('error', error.alreadyJoined())
      return
    }

    if (socket.data.userID.equals(game.darkId)) {
      game.darkSocketId = socket.id
    } else {
      game.lightSocketId = socket.id
    }

    await gameLib.setGame(roomID, game)
    return game
  })
  if (!game) return

  await socket.join(roomID)

  if (game.darkSocketId !== '' && game.lightSocketId !== '') {
    // Start game and notify
    const resDark = gameLib.createFoundRoomMsg(game.darkSocketId, roomID, game)
    const resLight = gameLib.createFoundRoomMsg(game.lightSocketId, roomID, game)

    io.to(game.darkSocketId).emit('room', resDark)
    io.to(game.lightSocketId).emit('room', resLight)

    const gameTimer = new ChessTimer(
      game.turn,
      game.timerDark ?? 500 * 1000,
      game.timerLight ?? 500 * 1000,
      game.timerIncrement ?? 5 * 1000,
      gameLib.timeoutProtocol(roomID)
    )

    chessTimers.set(roomID, gameTimer)
    await gameLib.startGameInDB(game, roomID)
  }
}
