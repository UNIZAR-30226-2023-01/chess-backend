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
import { FindRoomMsg, MoveMsg } from '@lib/types/socket-msg'
import { GameType } from '@lib/types/game'
import { ResourceName } from '@lib/namespaces'

/** All possible functions to handle a `move` event. */
const moveFunctions = new Map<GameType, Function>([
  [GameType.AI, ai.move],
  [GameType.CUSTOM, match.move],
  [GameType.COMPETITIVE, match.move],
  [GameType.TOURNAMENT, match.move]
])

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

  const game = await gameLib.getGame(roomID)
  if (!game) {
    socket.emit('error', error.notPlaying())
    return
  }

  const moveFunction = moveFunctions.get(game.gameType)
  if (moveFunction) moveFunction(socket, roomID, move)
}

/** All possible functions to handle a `surrender` event. */
const surrenderFunctions = new Map<GameType, Function>([
  [GameType.AI, match.surrender],
  [GameType.CUSTOM, match.surrender],
  [GameType.COMPETITIVE, match.surrender],
  [GameType.TOURNAMENT, match.surrender]
])

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

  const surrenderFunction = surrenderFunctions.get(game.gameType)
  if (surrenderFunction) surrenderFunction(socket, roomID)
}

/** All possible functions to handle a `vote_draw` event. */
const voteDrawFunctions = new Map<GameType, Function>([
  [GameType.CUSTOM, match.voteDraw],
  [GameType.COMPETITIVE, match.voteDraw]
])

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

  const voteDrawFunction = voteDrawFunctions.get(game.gameType)
  if (voteDrawFunction) {
    voteDrawFunction(socket, roomID)
  } else {
    socket.emit('error',
      error.notSupportedAction(
        `Not supported action in game type ${game.gameType}`))
  }
}

/** All possible functions to handle a `find_room` event. */
const findRoomFunctions = new Map<GameType, Function>([
  [GameType.AI, ai.findGame],
  [GameType.CUSTOM, custom.findGame],
  [GameType.COMPETITIVE, competitive.findGame],
  [GameType.TOURNAMENT, tournament.findGame]
])

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

  findRoomFunctions.set(GameType.TOURNAMENT, tournament.findGame)

  console.log(data.gameType)
  console.log(findRoomFunctions)

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
