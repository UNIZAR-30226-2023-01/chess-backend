import { Server, Socket } from 'socket.io'
import * as gameCtl from '@lib/game'
import * as roomCtl from '@lib/room'
const _ = require('lodash')

interface RoomMessage {
  roomID: string
}

const gameState = async (
  socket: Socket,
  roomID: string,
  join?: boolean
): Promise<boolean> => {
  const game = await gameCtl.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error', `No game with roomID: ${roomID}`)
      return
    }

    if (!gameCtl.isGameStarted(game)) {
      socket.emit('error', 'This game has not started yet')
      return
    }

    if (!gameCtl.updateGameTimer(roomID, game)) {
      socket.emit('error', 'Internal server error')
      return
    }

    if (join) {
      game.spectators.push(socket.data.username)
    }

    await gameCtl.setGame(roomID, game)
    return game
  })
  if (!game) return false

  socket.emit('room', gameCtl.filterGameState(game))
  return true
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

  if (gameCtl.isSocketInGame(socket)) {
    socket.emit('error', 'You have already joined a room')
    return
  }

  if (!await gameState(socket, roomID, true)) {
    return
  }

  console.log('join_room', data.roomID)
  await socket.join(data.roomID)
}

export const leaveRoom = async (
  socket: Socket
): Promise<void> => {
  const roomID = roomCtl.getGameRoom(socket)
  if (!roomID) {
    socket.emit('error', 'This socket is not watching any game')
    return
  }

  const game = await gameCtl.getGame(roomID, async (game) => {
    if (!game) { // TODO: Internal server error
      socket.emit('error', `No game with roomID: ${roomID}`)
      return
    }

    if (gameCtl.isPlayerOfGame(socket, game)) {
      socket.emit('error', 'Players cannot leave a room')
      return
    }

    if (!gameCtl.updateGameTimer(roomID, game)) {
      socket.emit('error', 'Internal server error')
      return
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

  await socket.leave(roomID)
}
