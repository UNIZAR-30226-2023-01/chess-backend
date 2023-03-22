import { Server, Socket } from 'socket.io'
import * as match from '@controllers/game/match-game'
import * as competitive from '@controllers/game/competitive-game'
import * as ai from '@controllers/game/ai-game'
import * as custom from '@controllers/game/custom-game'
import { chessTimers } from '@lib/timer'
import * as gameCtl from '@lib/game'
import { FindRoomMsg, MoveMsg, RoomIDMsg } from '@lib/types/socket-msg'
import { GameType } from '@lib/types/game'
const _ = require('lodash')

interface RoomMessage {
  roomID: string
}

const moveFunctions = new Map<GameType, Function>([
  // [GameType.AI, ai.move],
  [GameType.CUSTOM, match.move],
  [GameType.COMPETITIVE, match.move],
  [GameType.TOURNAMENT, match.move]
])

export const move = async (
  socket: Socket,
  io: Server,
  data: MoveMsg
): Promise<void> => {
  const roomID = data.roomID
  const move = data.move

  if (!(roomID && move)) {
    socket.emit('error', 'Missing parameters')
    return
  }

  const game = await gameCtl.getGame(roomID)
  if (!game) {
    socket.emit('error', `No game with roomID: ${roomID}`)
    return
  }

  const moveFunction = moveFunctions.get(game.gameType)
  if (moveFunction) moveFunction(socket, io, data)
}

const surrenderFunctions = new Map<GameType, Function>([
  // [GameType.AI, ai.surrender],
  [GameType.CUSTOM, match.surrender],
  [GameType.COMPETITIVE, match.surrender],
  [GameType.TOURNAMENT, match.surrender]
])

export const surrender = async (
  socket: Socket,
  io: Server,
  data: RoomIDMsg
): Promise<void> => {
  const roomID = data.roomID

  if (!roomID) {
    socket.emit('error', 'Missing parameters')
    return
  }

  const game = await gameCtl.getGame(roomID)
  if (!game) {
    socket.emit('error', `No game with roomID: ${roomID}`)
    return
  }

  const surrenderFunction = surrenderFunctions.get(game.gameType)
  if (surrenderFunction) surrenderFunction(socket, io, data)
}

const findRoomFunctions = new Map<GameType, Function>([
  [GameType.AI, ai.findGame],
  [GameType.CUSTOM, custom.findGame],
  [GameType.COMPETITIVE, competitive.findGame]
  // [GameType.TOURNAMENT, tournament.findRoom]
])

export const findRoom = async (
  socket: Socket,
  io: Server,
  data: FindRoomMsg
): Promise<void> => {
  const findRoomFunction = findRoomFunctions.get(data.gameType)

  if (findRoomFunction) findRoomFunction(socket, io, data)
  else socket.emit('error', 'Not supported game type')
}

const gameState = async (
  socket: Socket,
  roomID: string,
  join?: boolean
): Promise<void> => {
  const game = await gameCtl.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error', `No game with roomID: ${roomID}`)
      return
    }

    if (game.useTimer && !game.finished) {
      const gameTimer = chessTimers.get(roomID)

      if (!gameTimer) {
        socket.emit('error', 'Internal server error')
        return
      } else {
        game.timerDark = gameTimer.getTimeDark()
        game.timerLight = gameTimer.getTimeLight()
      }
    }

    if (join) {
      game.spectators.push(socket.data.username)
    }

    await gameCtl.setGame(roomID, game)
    return game
  })
  if (!game) return

  socket.emit('game_state', gameCtl.filterGameState(game))
}

export const joinRoom = async (
  socket: Socket,
  io: Server,
  data: RoomMessage
): Promise<void> => {
  if (!data.roomID) {
    socket.emit('error', 'Missing parameters')
    return
  }

  const roomID = data.roomID
  if (!io.sockets.adapter.rooms.get(roomID)) {
    socket.emit('error', `No game with roomID: ${roomID}`)
    return
  }

  if (socket.rooms.has(roomID)) {
    socket.emit('error', 'You have already joined this room')
    return
  }

  await gameState(socket, roomID, true)

  console.log('join_room', data.roomID)
  await socket.join(data.roomID)
}

export const leaveRoom = async (
  socket: Socket,
  io: Server,
  data: RoomMessage
): Promise<void> => {
  if (!data.roomID) {
    socket.emit('error', 'Missing parameters')
    return
  }

  const roomID = data.roomID
  if (io.sockets.adapter.rooms.get(data.roomID) == null) {
    socket.emit('error', `No game with roomID: ${roomID}`)
    return
  }

  if (!socket.rooms.has(roomID)) {
    socket.emit('error', 'You have not joined this room')
    return
  }

  const game = await gameCtl.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error', `No game with roomID: ${roomID}`)
      return
    }

    if (gameCtl.isPlayerOfGame(socket, game)) {
      socket.emit('error', 'Players cannot leave a room')
      return
    }

    if (game.useTimer) {
      const gameTimer = chessTimers.get(roomID)
      if (!gameTimer) {
        socket.emit('error', 'Internal server error')
        return
      }
      game.timerDark = gameTimer.getTimeDark()
      game.timerLight = gameTimer.getTimeLight()
    }

    _.pullAt(
      game.spectators,
      [_.indexOf(game.spectators,
        socket.data.username
      )]
    )

    await gameCtl.setGame(roomID, game)
    return game
  })
  if (!game) return

  await socket.leave(data.roomID)
}
