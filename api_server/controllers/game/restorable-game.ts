import { GameState, GameType, PlayerColor, State } from '@lib/types/game'
import { io } from '@server'
import { Socket } from 'socket.io'
import * as ai from '@controllers/game/ai-game'
import * as custom from '@controllers/game/custom-game'
import * as restoreQ from '@lib/restore-queue'
import * as gameLib from '@lib/game'
import * as roomLib from '@lib/room'
import { GameIDMsg } from '@lib/types/socket-msg'
import { Types } from 'mongoose'
import { GameModel } from '@models/game'
import { ReservedUsernames, UserModel } from '@models/user'

export const saveGame = async (
  socket: Socket
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)
  if (!roomID) {
    socket.emit('error', 'This socket is not playing any game')
    return
  }

  // DEBUG RAPIDO
  const query = (await GameModel.findOne({ roomID }))
  const gameID = query?._id.toString()
  // -----------------------------------

  let save = false
  const game = await gameLib.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error', `No game with roomID: ${roomID}`)
      return
    }

    if (game.gameType !== GameType.CUSTOM && game.gameType !== GameType.AI) {
      socket.emit('error', `Not supported action in game type ${game.gameType}`)
      return
    }

    if (game.gameType === GameType.AI && !game.darkId && !game.lightId) {
      socket.emit('error', 'AI games can only be saved by authenticated users')
      return
    }

    if (game.finished) {
      socket.emit('error', 'Game has already been finished')
      return
    }

    if (!gameLib.isPlayerOfGame(socket, game)) {
      socket.emit('error', 'You are not a player of this game')
      return
    }

    const color = gameLib.getColor(socket, game)

    if (color === PlayerColor.DARK) {
      game.darkVotedSave = true
    } else {
      game.lightVotedSave = true
    }

    if ((game.gameType === GameType.AI) ||
        (game.darkVotedDraw && game.lightVotedDraw)) {
      save = true
      gameLib.removeTimer(roomID)
      await gameLib.unsetGame(roomID)
    } else {
      if (!gameLib.updateGameTimer(roomID, game)) {
        socket.emit('error', 'Internal server error')
      }
      await gameLib.setGame(roomID, game)
    }
    return game
  })
  if (!game) return

  if (save) {
    if (!await gameLib.pauseGameInDB(game, roomID)) {
      socket.emit('error', 'Internal server error')
      return
    }

    io.to(roomID).emit('game_saved',
      /* PARA DEBUG RAPIDO */ gameID)
    await gameLib.pauseGameInDB(game, roomID)
    io.in(roomID).socketsLeave(roomID)
  } else {
    io.to(roomID).emit('voted_save', { color: gameLib.getColor(socket, game) })
  }
}

export const resumeGame = async (
  socket: Socket,
  data: GameIDMsg
): Promise<void> => {
  if (!data.gameID) {
    socket.emit('error', 'Missing parameters')
    return
  }

  const gameID = new Types.ObjectId(data.gameID)
  console.log('GAME ID:', gameID)

  if (gameLib.isSocketInGame(socket)) {
    socket.emit('error', 'This socket is already playing or in queue')
    return
  }

  const gameAndState = await gameLib.getGameStateFromDB(gameID)
  if (!gameAndState) {
    socket.emit('error', 'Internal server error')
    return
  }

  const { game, state } = gameAndState

  if (state !== State.PAUSED && state !== State.RESUMING) {
    socket.emit('error', 'This game is not paused')
    return
  }

  console.log('UserID:', socket.data.userID)
  if (!gameLib.isIdOnGame(socket.data.userID, game)) {
    socket.emit('error', 'You are not player of this game')
    return
  }

  if (state === State.RESUMING || !await restoreQ.pushGameID(data.gameID)) {
    if (game.gameType === GameType.AI) {
      socket.emit('error', 'This game has already been resumed')
    } else if (!gameAndState.roomID) {
      socket.emit('error', 'Internal server error')
    } else {
      await custom.findGame(socket, {
        roomID: gameAndState.roomID, gameType: game.gameType
      })
    }
  } else {
    const roomID = await roomLib.generateUniqueRoomCode()
    await completeUserInfo(socket, game)
    await gameLib.setGame(roomID, game)

    if (game.gameType === GameType.CUSTOM) {
      console.log('NOOOOOOOOOOOOOOOO')
    } else { // GameType.AI
      await ai.startAIGame(socket, game, roomID)
    }

    await restoreQ.pullGameID(data.gameID)
  }
}

const completeUserInfo = async (socket: Socket, game: GameState): Promise<void> => {
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
