import * as gameCtl from '@lib/game'
import { FindRoomMsg } from '@lib/types/socket-msg'
import { Server, Socket } from 'socket.io'

export const findGame = async (
  socket: Socket,
  io: Server,
  data: FindRoomMsg
): Promise<void> => {
  if (data.roomID) {
    await joinGame(socket, io, data.roomID)
    return
  }

  const check = gameCtl.checkFindRoomMsgParameters(data)
  if (check.error) {
    socket.emit('error', check.error)
  }

  await createGame(socket, io, data, check.useTimer)
}

const createGame = async (
  _socket: Socket,
  _io: Server,
  _data: FindRoomMsg,
  _useTimer: boolean
): Promise<void> => {
  // TODO: unirse a partida personalizada
}

const joinGame = async (
  _socket: Socket,
  _io: Server,
  _roomID: string
): Promise<void> => {
  // TODO: unirse a partida personalizada
}
