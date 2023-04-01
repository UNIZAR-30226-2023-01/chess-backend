import { Server, Socket } from 'socket.io'
import * as gameLib from '@lib/game'
import * as roomLib from '@lib/room'
import * as gameCtl from '@controllers/game/game'
import * as spectatorCtl from '@controllers/game/spectator'

const DISCONNECTION_TIME = 60 // Check every minute

export const disconnect = async (
  socket: Socket,
  io: Server
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)
  if (roomID) {
    const game = await gameLib.getGame(roomID)
    if (game) {
      if (gameLib.isPlayerOfGame(socket, game)) {
        await gameCtl.surrender(socket, io)
      } else {
        await spectatorCtl.leaveRoom(socket)
      }
    }
  }
  socket.disconnect()
}

export const heartbeat = (
  socket: Socket,
  io: Server
): void => {
  if (socket.data.timeout) {
    clearTimeout(socket.data.timeout)
  }
  socket.data.timeout = setTimeout(
    disconnect,
    DISCONNECTION_TIME * 1000,
    socket,
    io
  )
}
