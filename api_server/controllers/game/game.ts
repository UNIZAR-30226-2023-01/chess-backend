import { Socket } from 'socket.io'
import * as match from '@controllers/game/match-game'
import * as competitive from '@controllers/game/competitive-game'
import * as ai from '@controllers/game/ai-game'
import * as custom from '@controllers/game/custom-game'
import * as restorable from '@controllers/game/restorable-game'
import * as gameLib from '@lib/game'
import * as roomLib from '@lib/room'
import { FindRoomMsg, MoveMsg } from '@lib/types/socket-msg'
import { GameType } from '@lib/types/game'

const moveFunctions = new Map<GameType, Function>([
  [GameType.AI, ai.move],
  [GameType.CUSTOM, match.move],
  [GameType.COMPETITIVE, match.move],
  [GameType.TOURNAMENT, match.move]
])

export const move = async (
  socket: Socket,
  data: MoveMsg
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)
  if (!roomID) {
    socket.emit('error', 'This socket is not playing any game')
    return
  }

  const move = data.move
  if (!move) {
    socket.emit('error', 'Missing parameters')
    return
  }

  const game = await gameLib.getGame(roomID)
  if (!game) {
    socket.emit('error', `No game with roomID: ${roomID}`)
    return
  }

  const moveFunction = moveFunctions.get(game.gameType)
  if (moveFunction) moveFunction(socket, roomID, move)
}

const surrenderFunctions = new Map<GameType, Function>([
  [GameType.AI, match.surrender],
  [GameType.CUSTOM, match.surrender],
  [GameType.COMPETITIVE, match.surrender],
  [GameType.TOURNAMENT, match.surrender]
])

export const surrender = async (
  socket: Socket
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)
  if (!roomID) {
    socket.emit('error', 'This socket is not playing any game')
    return
  }

  const game = await gameLib.getGame(roomID)
  if (!game) {
    socket.emit('error', `No game with roomID: ${roomID}`)
    return
  }

  const surrenderFunction = surrenderFunctions.get(game.gameType)
  if (surrenderFunction) surrenderFunction(socket, roomID)
}

const voteDrawFunctions = new Map<GameType, Function>([
  [GameType.CUSTOM, match.voteDraw],
  [GameType.COMPETITIVE, match.voteDraw]
])

export const voteDraw = async (
  socket: Socket
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)
  if (!roomID) {
    socket.emit('error', 'This socket is not playing any game')
    return
  }

  const game = await gameLib.getGame(roomID)
  if (!game) {
    socket.emit('error', `No game with roomID: ${roomID}`)
    return
  }

  const voteDrawFunction = voteDrawFunctions.get(game.gameType)
  if (voteDrawFunction) {
    voteDrawFunction(socket, roomID)
  } else {
    socket.emit('error', `Not supported action in game type ${game.gameType}`)
  }
}

const findRoomFunctions = new Map<GameType, Function>([
  [GameType.AI, ai.findGame],
  [GameType.CUSTOM, custom.findGame],
  [GameType.COMPETITIVE, competitive.findGame]
  // [GameType.TOURNAMENT, tournament.findRoom]
])

export const findRoom = async (
  socket: Socket,
  data: FindRoomMsg
): Promise<void> => {
  console.log('ROOMSS: ', socket.rooms)

  if (gameLib.isSocketInGame(socket)) {
    socket.emit('error', 'This socket is already playing or in queue')
    return
  }

  const findRoomFunction = findRoomFunctions.get(data.gameType)
  if (findRoomFunction) {
    findRoomFunction(socket, data)
  } else {
    socket.emit('error', 'Not supported game type')
  }
}

export const voteSave = restorable.saveGame
export const resumeGame = restorable.resumeGame
