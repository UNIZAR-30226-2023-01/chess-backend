import { Server, Socket } from 'socket.io'
import { chessTimers } from '@lib/timer'
import * as gameCtl from '@lib/game'
const _ = require('lodash')

interface RoomMessage {
  roomID: string
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
