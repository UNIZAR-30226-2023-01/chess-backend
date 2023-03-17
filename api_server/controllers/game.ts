import { Server, Socket } from 'socket.io'
import { GameState } from '@models/game'
import * as match from '@controllers/match_game'
import { chessTimers } from '@lib/timer'
import * as gameCtl from '@lib/game'
const _ = require('lodash')

interface RoomMessage {
  roomID: string
}

export const findGame = match.findGame
export const move = match.move
export const surrender = match.surrender

export const createRoom = async (
  socket: Socket,
  data: RoomMessage
): Promise<void> => {
  console.log('create_room', JSON.stringify(data))
  await socket.join(data.roomID)
}

export const gameState = async (
  socket: Socket,
  data: RoomMessage,
  join?: boolean
): Promise<void> => {
  if (!data.roomID) {
    socket.emit('error', 'Missing parameters')
    return
  }

  const roomID = data.roomID
  const game = await gameCtl.getGame(roomID, async (game: GameState) => {
    if (game.use_timer && !game.finished) {
      const gameTimer = chessTimers.get(roomID)
      if (!gameTimer) {
        socket.emit('error', 'Internal server error')
        return
      } else {
        game.timer_dark = gameTimer.getTimeDark()
        game.timer_light = gameTimer.getTimeLight()
      }
    }

    if (join) {
      game.spectators.push(socket.data.username)
    }

    await gameCtl.setGame(roomID, game)
  })

  if (!game) {
    socket.emit('error', `No game with roomID: ${roomID}`)
    return
  }

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

  await gameState(socket, data, true)

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

  const game = await gameCtl.getGame(roomID, async (game: GameState) => {
    if (game.use_timer) {
      const gameTimer = chessTimers.get(roomID)
      if (!gameTimer) {
        socket.emit('error', 'Internal server error')
        return
      }
      game.timer_dark = gameTimer.getTimeDark()
      game.timer_light = gameTimer.getTimeLight()
    }

    _.pullAt(
      game.spectators,
      [_.indexOf(game.spectators,
        socket.data.username
      )]
    )

    await gameCtl.setGame(roomID, game)
  })

  if (!game) {
    socket.emit('error', `No game with roomID: ${roomID}`)
    return
  }

  await socket.leave(data.roomID)
}
