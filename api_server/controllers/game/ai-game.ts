import * as gameCtl from '@lib/game'
import { FindRoomMsg } from '@lib/types/socket-msg'
import { Server, Socket } from 'socket.io'

export const findGame = async (
  socket: Socket,
  _io: Server,
  data: FindRoomMsg
): Promise<void> => {
  const check = gameCtl.checkFindRoomMsgParameters(data)
  if (check.error) {
    socket.emit('error', check.error)
  }

  // TODO: crear partida contra la máquina
}
