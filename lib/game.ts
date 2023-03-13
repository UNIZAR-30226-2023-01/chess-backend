import { Server } from 'socket.io'
import { EndState, GameModel, GameState, GameType, PlayerColor } from '../api_server/models/game'
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

export const saveGame = async (
  io: Server,
  game: GameState
): Promise<boolean> => {
  const darkSocket = io.sockets.sockets.get(game.dark_socket_id)
  const lightSocket = io.sockets.sockets.get(game.light_socket_id)

  const darkIsAuth: boolean = darkSocket?.data.authenticated
  const lightIsAuth: boolean = lightSocket?.data.authenticated

  if (!darkIsAuth || !lightIsAuth) {
    return false
  }

  try {
    await GameModel.create({
      dark: game.dark,
      light: game.light,
      dark_id: game.dark_id,
      light_id: game.light_id,

      board: game.board,
      moves: game.moves,

      use_timer: game.use_timer,
      initial_timer: game.initial_timer,
      timer_increment: game.timer_increment,
      timer_dark: game.timer_dark,
      timer_light: game.timer_light,

      finished: game.finished,
      end_state: game.end_state,
      winner: game.winner,

      game_type: game.game_type
    })
  } catch (error: any) {
    console.log(error)
    return false
  }

  return true
}

export const endProtocol = async (
  io: Server,
  roomID: string,
  game: GameState
): Promise<void> => {
  // After some time every socket in the room is forced to leave
  setTimeout(() => {
    io.in(roomID).socketsLeave(roomID)
  }, gameOverTTL * 1000)

  // and timer is removed
  const gameTimer = chessTimers.get(roomID)
  if (gameTimer) gameTimer.stop()
  chessTimers.delete(roomID)

  // Then save in database
  if (game.game_type === GameType.COMPETITIVE) {
    if (!await saveGame(io, game)) {
      console.error('Error al guardar la partida')
    }
  }
}

export const timeoutProtocol = (
  io: Server,
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

      await setGame(roomID, game, true)
    })
    if (!game) {
      console.log('Error at timeoutProtocol: No game with roomID:', roomID)
      return
    }

    void endProtocol(io, roomID, game)

    const message: GameOverMessage = {
      winner,
      end_state: EndState.TIMEOUT
    }

    io.to(roomID).emit('game_over', message)
  }
}

export const filterGameState = (msg: any): any => {
  delete msg.dark_socket_id
  delete msg.dark_id
  delete msg.light_socket_id
  delete msg.light_id

  if (!msg.use_timer) {
    delete msg.initial_timer
    delete msg.increment
    delete msg.timer_dark
    delete msg.timer_light
  }

  if (!msg.finished) {
    delete msg.end_state
    delete msg.winner
  }

  return msg
}
