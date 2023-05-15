import { Socket } from 'socket.io'
import * as match from '@controllers/game/match-game'
import * as competitive from '@controllers/game/competitive-game'
import * as ai from '@controllers/game/ai-game'
import * as custom from '@controllers/game/custom-game'
import * as restorable from '@controllers/game/restorable-game'
import * as tournament from '@controllers/game/tournament'
import * as gameLib from '@lib/game'
import * as roomLib from '@lib/room'
import * as matchmaking from '@lib/matchmaking'
import * as error from '@lib/socket-error'
import { FindRoomMsg, MoveMsg, SaluteMsg } from '@lib/types/socket-msg'
import { GameType } from '@lib/types/game'
import { ResourceName } from '@lib/namespaces'

export const salute = async (
  socket: Socket,
  data: SaluteMsg
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)
  if (!roomID) {
    socket.emit('error', error.notPlaying())
    return
  }

  const game = await gameLib.getGame(roomID)
  if (!game || !gameLib.isPlayerOfGame(socket, game)) {
    socket.emit('error', error.notPlayerOfThisGame())
    return
  }

  if (!data.text) socket.to(roomID).emit('salute')
  else socket.to(roomID).emit('salute', data.text)
}

/**
 * Executes the given move to the game this socket has joined.
 *
 * @param socket Socket connexion of the player.
 * @param data Object containing the move.
 */
export const move = async (
  socket: Socket,
  data: MoveMsg
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)
  if (!roomID) {
    socket.emit('error', error.notPlaying())
    return
  }

  const move = data.move
  if (!move) {
    socket.emit('error', error.invalidParams('Missing parameters.'))
    return
  }

  /** All possible functions to handle a `move` event. */
  const moveFunctions = new Map<GameType, Function>()
  moveFunctions.set(GameType.AI, ai.move)
  moveFunctions.set(GameType.CUSTOM, match.move)
  moveFunctions.set(GameType.COMPETITIVE, match.move)
  moveFunctions.set(GameType.TOURNAMENT, match.move)

  const game = await gameLib.getGame(roomID)
  if (!game) {
    socket.emit('error', error.notPlaying())
    return
  }

  const moveFunction = moveFunctions.get(game.gameType)
  if (moveFunction) moveFunction(socket, roomID, move)
}

/**
 * Make the user playing with this socket surrender.
 *
 * @param socket Socket connexion of the player.
 */
export const surrender = async (
  socket: Socket
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)
  if (!roomID) {
    socket.emit('error', error.notPlaying())
    return
  }

  const game = await gameLib.getGame(roomID)
  if (!game) {
    socket.emit('error', error.notPlaying())
    return
  }

  /** All possible functions to handle a `surrender` event. */
  const surrenderFunctions = new Map<GameType, Function>()
  surrenderFunctions.set(GameType.AI, match.surrender)
  surrenderFunctions.set(GameType.CUSTOM, match.surrender)
  surrenderFunctions.set(GameType.COMPETITIVE, match.surrender)
  surrenderFunctions.set(GameType.TOURNAMENT, match.surrender)

  const surrenderFunction = surrenderFunctions.get(game.gameType)
  if (surrenderFunction) surrenderFunction(socket, roomID)
}

/**
 * Make the user playing with this socket vote for a draw.
 *
 * @param socket Socket connexion of the player.
 */
export const voteDraw = async (
  socket: Socket
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)
  if (!roomID) {
    socket.emit('error', error.notPlaying())
    return
  }

  const game = await gameLib.getGame(roomID)
  if (!game) {
    socket.emit('error', error.notPlaying())
    return
  }

  /** All possible functions to handle a `vote_draw` event. */
  const voteDrawFunctions = new Map<GameType, Function>()
  voteDrawFunctions.set(GameType.CUSTOM, match.voteDraw)
  voteDrawFunctions.set(GameType.COMPETITIVE, match.voteDraw)

  const voteDrawFunction = voteDrawFunctions.get(game.gameType)
  if (voteDrawFunction) {
    voteDrawFunction(socket, roomID)
  } else {
    socket.emit('error',
      error.notSupportedAction(
        `Not supported action in game type ${game.gameType}`))
  }
}

/**
 * Finds/creates/joins a game depending on the data sent.
 *
 * @param socket Socket connexion of the player.
 * @param data Game configuration.
 */
export const findRoom = async (
  socket: Socket,
  data: FindRoomMsg
): Promise<void> => {
  if (gameLib.isSocketInGame(socket)) {
    socket.emit('error', error.alreadyPlaying())
    return
  }

  /** All possible functions to handle a `find_room` event. */
  const findRoomFunctions = new Map<GameType, Function>()
  findRoomFunctions.set(GameType.AI, ai.findGame)
  findRoomFunctions.set(GameType.CUSTOM, custom.findGame)
  findRoomFunctions.set(GameType.COMPETITIVE, competitive.findGame)
  findRoomFunctions.set(GameType.TOURNAMENT, tournament.findGame)

  const findRoomFunction = findRoomFunctions.get(data.gameType)
  if (findRoomFunction) {
    findRoomFunction(socket, data)
  } else {
    socket.emit('error', error.invalidParams('Not supported game type.'))
  }
}

/**
 * Make the user playing with this socket save the game or vote for a it
 * wheter it is an 1-player or 2-player game.
 *
 * @param socket Socket connexion of the player.
 */
export const voteSave = restorable.saveGame

/**
 * Restores the saved game with the given id for the same
 * players to continue playing from the same game state.
 *
 * @param socket Socket connexion of the player.
 * @param data Object containing the id of the saved game.
 */
export const resumeGame = restorable.resumeGame

/**
 * Cancels the search or creation of a game.
 *
 * @param socket Socket connexion of the player.
 */
export const cancelGameCreation = async (
  socket: Socket
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)

  if (roomID === ResourceName.PLAYER_Q &&
      await matchmaking.cancelSearch(socket)) {
    await competitive.cancelSearch(socket, roomID)
    return
  }

  if (!roomID) {
    socket.emit('error', error.notPlaying())
    return
  }

  const isCompetitive = await matchmaking.cancelSearch(socket)

  if (isCompetitive) {
    await competitive.cancelSearch(socket, roomID)
    return
  }

  const game = await gameLib.getGame(roomID)
  if (!game) {
    socket.emit('error', error.notPlaying())
    return
  } else if (game.gameType !== GameType.CUSTOM &&
             game.gameType !== GameType.COMPETITIVE) {
    socket.emit('error',
      error.notSupportedAction(
        `Not supported action in game type ${game.gameType}`))
    return
  }

  await custom.cancelCreation(socket, roomID)
}
