import { GameType, PlayerColor, State } from '@lib/types/game'
import { io } from '@server'
import { Socket } from 'socket.io'
import * as ai from '@controllers/game/ai-game'
import * as error from '@lib/socket-error'
import * as custom from '@controllers/game/custom-game'
import * as restoreQ from '@lib/restore-queue'
import * as gameLib from '@lib/game'
import * as roomLib from '@lib/room'
import { GameIDMsg } from '@lib/types/socket-msg'
import { Types } from 'mongoose'

/**
 * Make the user playing with this socket save the game or vote for a it
 * wheter it is an 1-player or 2-player game.
 *
 * @param socket Socket connexion of the player.
 */
export const saveGame = async (
  socket: Socket
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)
  if (!roomID) {
    socket.emit('error', error.notPlaying())
    return
  }

  // Uncomment for replying the _id property of the game (debug only)
  /*
    const query = (await GameModel.findOne({ roomID }))
    const gameID = query?._id.toString()
  */

  let save = false
  const game = await gameLib.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error', error.notPlaying())
      return
    }

    if (game.gameType !== GameType.CUSTOM && game.gameType !== GameType.AI) {
      socket.emit('error',
        error.notSupportedAction(
         `Not supported action in game type ${game.gameType}`))
      return
    }

    if (game.gameType === GameType.AI && !game.darkId && !game.lightId) {
      socket.emit('error',
        error.mustBeAuthenticated(
          'AI games can only be saved by authenticated users.'))
      return
    }

    if (game.finished) {
      socket.emit('error', error.gameAlreadyFinished())
      return
    }

    if (!gameLib.isPlayerOfGame(socket, game)) {
      socket.emit('error', error.notPlayerOfThisGame())
      return
    }

    // ---- End of validation ---- //

    const color = gameLib.getColor(socket, game)

    if (color === PlayerColor.DARK) {
      game.darkVotedSave = true
    } else {
      game.lightVotedSave = true
    }

    if ((game.gameType === GameType.AI) ||
        (game.darkVotedSave && game.lightVotedSave)) {
      save = true
      gameLib.removeTimer(roomID)
      await gameLib.unsetGame(roomID)
    } else {
      if (!gameLib.updateGameTimer(roomID, game)) {
        socket.emit('error', error.internalServerError())
      }
      await gameLib.setGame(roomID, game)
    }
    return game
  })
  if (!game) return

  if (save) { // => Both players agree
    if (!await gameLib.pauseGameInDB(game, roomID)) {
      socket.emit('error', error.internalServerError())
      return
    }

    // io.to(roomID).emit('game_saved', gameID)
    io.to(roomID).emit('game_saved')
    io.in(roomID).socketsLeave(roomID)
  } else {
    io.to(roomID).emit('voted_save', { color: gameLib.getColor(socket, game) })
  }
}

/**
 * Restores the saved game with the given id for the same
 * players to continue playing from the same game state.
 *
 * @param socket Socket connexion of the player.
 * @param data Object containing the id of the saved game.
 */
export const resumeGame = async (
  socket: Socket,
  data: GameIDMsg
): Promise<void> => {
  if (!data.gameID) {
    socket.emit('error', error.invalidParams('Missing parameters'))
    return
  }

  let gameID
  try {
    gameID = new Types.ObjectId(data.gameID)
  } catch (err: any) {
    socket.emit('error',
      error.invalidParams(`No game with gameID: ${data.gameID}`))
    return
  }

  if (gameLib.isSocketInGame(socket)) {
    socket.emit('error', error.alreadyPlaying())
    return
  }

  const gameAndState = await gameLib.getGameStateFromDB(gameID)
  if (!gameAndState) {
    socket.emit('error',
      error.invalidParams(`No game with gameID: ${data.gameID}`))
    return
  }

  const { game, state } = gameAndState

  if (state !== State.PAUSED && state !== State.RESUMING) {
    socket.emit('error', error.gameNotPaused())
    return
  }

  if (!gameLib.isIdOnGame(socket.data.userID, game)) {
    socket.emit('error', error.notPlayerOfThisGame())
    return
  }

  if (state === State.RESUMING || !await restoreQ.pushGameID(data.gameID)) {
    if (game.gameType === GameType.AI) {
      socket.emit('error',
        error.gameAlreadyStarted('This game has already been resumed.'))
    } else if (!gameAndState.roomID) {
      socket.emit('error', error.internalServerError())
    } else {
      await custom.findGame(socket, {
        roomID: gameAndState.roomID, gameType: game.gameType
      })
    }
  } else {
    const roomID = await roomLib.generateUniqueRoomCode()
    if (game.gameType === GameType.CUSTOM) {
      await custom.completeUserInfo(socket, game)
      await gameLib.setGame(roomID, game)
      await socket.join(roomID)
      await gameLib.resumeGameInDB(game, gameID, roomID)
      socket.emit('room_created', { roomID })
    } else { // GameType.AI
      await ai.completeUserInfo(socket, game)
      await gameLib.setGame(roomID, game)
      await gameLib.resumeGameInDB(game, gameID, roomID)
      await ai.startAIGame(socket, game, roomID)
    }

    await restoreQ.pullGameID(data.gameID)
  }
}
