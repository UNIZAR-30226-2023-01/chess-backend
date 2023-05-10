import { Socket } from 'socket.io'
import * as gameLib from '@lib/game'
import * as roomLib from '@lib/room'
import * as error from '@lib/socket-error'
import { io } from '@server'
import { RoomIDMsg } from '@lib/types/socket-msg'
import _ from 'lodash'

/**
 * Emits a `room` event with the game state of the game with the given room id.
 *
 * @param socket Socket connexion of the player.
 * @param roomID Identifier of the room where the game is allocated.
 * @param join Set to `true` if the socket id should be added to the espectator list.
 *
 * @returns `true` only if no error was emitted.
 */
const gameState = async (
  socket: Socket,
  roomID: string,
  join?: boolean
): Promise<boolean> => {
  const game = await gameLib.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error',
        error.invalidParams(`No game with roomID: ${roomID}`))
      return
    }

    if (!gameLib.isGameStarted(game)) {
      socket.emit('error', error.invalidParams('This game has not started yet.'))
      return
    }

    if (!gameLib.updateGameTimer(roomID, game)) {
      socket.emit('error', error.internalServerError())
      return
    }

    if (join) {
      game.spectators.push(socket.data.username)
    }

    await gameLib.setGame(roomID, game)
    return game
  })
  if (!game) return false

  socket.emit('room', gameLib.filterGameState(game))
  return true
}

/**
 * Joins this socket to the given room for it to watch the game.
 *
 * @param socket Socket connexion of the player.
 * @param data Object containing the room id.
 */
export const joinRoom = async (
  socket: Socket,
  data: RoomIDMsg
): Promise<void> => {
  if (!data.roomID) {
    socket.emit('error', error.invalidParams('Missing parameters.'))
    return
  }

  const roomID = data.roomID
  if (!io.sockets.adapter.rooms.get(roomID)) {
    socket.emit('error', error.invalidParams(`No game with roomID: ${roomID}`))
    return
  }

  if (gameLib.isSocketInGame(socket)) {
    socket.emit('error', error.alreadyJoined())
    return
  }

  if (!await gameState(socket, roomID, true)) return

  await socket.join(data.roomID)
}

/**
 * Leaves the room this socket is in.
 *
 * @param socket Socket connexion of the player.
 */
export const leaveRoom = async (
  socket: Socket
): Promise<void> => {
  const roomID = roomLib.getGameRoom(socket)
  if (!roomID) {
    socket.emit('error', error.notWatching())
    return
  }

  const game = await gameLib.getGame(roomID, async (game) => {
    if (!game) {
      socket.emit('error', error.notWatching())
      return
    }

    if (gameLib.isPlayerOfGame(socket, game)) {
      socket.emit('error',
        error.notSupportedAction('Players cannot leave a room.'))
      return
    }

    if (!gameLib.updateGameTimer(roomID, game)) {
      socket.emit('error', error.internalServerError())
      return
    }

    _.pullAt(
      game.spectators,
      [_.indexOf(game.spectators,
        socket.data.username
      )]
    )

    await gameLib.setGame(roomID, game)
    return game
  })
  if (!game) return

  await socket.leave(roomID)
}
