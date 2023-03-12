import { Server, Socket } from 'socket.io'
import { EndState, GameState, PlayerColor } from '../api_server/models/game'
import { client, redlock } from '../config/database'
import { roomLockPrefix, roomPrefix } from './room'
import { chessTimers } from './timer'
import { GameOverMessage } from './messages.types'

// 2 minutes after a game is over, it is deleted from redis
export const gameOverTTL = 2 * 60

export const getGame = async (
  roomID: string,
  action: (game: GameState) => Promise<void>
): Promise<GameState | undefined> => {
  let game: GameState
  let lock = await redlock.acquire([roomLockPrefix + roomID], 5000) // LOCK
  try {
    const rawGame = await client.get(roomPrefix + roomID)
    if (!rawGame) {
      return undefined
    }

    lock = await lock.extend(5000) // EXTEND

    game = JSON.parse(rawGame)
    await action(game)
  } finally {
    // This block executes even if a return statement is called
    await lock.release() // UNLOCK
  }
  return game
}

export const setGame = async (
  roomID: string,
  game: GameState,
  end?: boolean
): Promise<void> => {
  if (end) {
    await client.setex(roomPrefix + roomID, gameOverTTL, JSON.stringify(game))
  } else {
    await client.set(roomPrefix + roomID, JSON.stringify(game))
  }
}

export const endProtocol = (io: Server, roomID: string): void => {
  // After some time every socket in the room is forced to leave
  setTimeout(() => {
    io.in(roomID).socketsLeave(roomID)
  }, gameOverTTL * 1000)

  // and timer is removed
  const gameTimer = chessTimers.get(roomID)
  if (gameTimer) gameTimer.stop()
  chessTimers.delete(roomID)
}

export const timeoutProtocol = (
  io: Server,
  socket: Socket,
  roomID: string
): (winner: PlayerColor) => Promise<void> => {
  return async (winner: PlayerColor) => {
    const game = await getGame(roomID, async (game: GameState) => {
      if (winner === PlayerColor.LIGHT) {
        game.timer_dark = 0
      } else {
        game.timer_light = 0
      }
      game.finished = true
      game.end_state = EndState.TIMEOUT

      endProtocol(io, roomID)
      await setGame(roomID, game, true)
    })
    if (!game) {
      console.log('Error at timeoutProtocol: No game with roomID:', roomID)
      return
    }

    const message: GameOverMessage = {
      winner,
      end_state: EndState.TIMEOUT
    }

    socket.to(roomID).emit('game_over', message)
    socket.emit('game_over', message)
  }
}
