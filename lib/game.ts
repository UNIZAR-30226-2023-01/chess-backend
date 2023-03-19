import { Server, Socket } from 'socket.io'
import { EndState, GameState, GameType, PlayerColor } from '@lib/types/game'
import { client, redlock } from '@config/database'
import { chessTimers } from '@lib/timer'
import { FindRoomMsg, GameOverMsg } from '@lib/types/socket-msg'
import { GameModel } from '@models/game'
import { composeLock, compose, ResourceName } from '@lib/namespaces'

// 2 minutes after a game is over, it is deleted from redis
export const GAME_OVER_TTL = 2 * 60

export const getGame = async (
  roomID: string,
  action?: (game?: GameState) => Promise<GameState | undefined>
): Promise<GameState | undefined> => {
  const lockName = composeLock(ResourceName.ROOM, roomID)
  const resource = compose(ResourceName.ROOM, roomID)

  let game: GameState | undefined
  let lock = await redlock.acquire([lockName], 5000) // LOCK
  try {
    const rawGame = await client.get(resource)
    if (!rawGame) game = undefined
    else game = JSON.parse(rawGame)

    lock = await lock.extend(5000) // EXTEND
    if (action) {
      game = await action(game)
    }
  } catch (err) {
    game = undefined
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
  const resource = compose(ResourceName.ROOM, roomID)
  if (end) {
    await client.setex(resource, GAME_OVER_TTL, JSON.stringify(game))
  } else {
    await client.set(resource, JSON.stringify(game))
  }
}

export const saveGame = async (
  io: Server,
  game: GameState
): Promise<boolean> => {
  const darkSocket = io.sockets.sockets.get(game.darkSocketId)
  const lightSocket = io.sockets.sockets.get(game.lightSocketId)

  const darkIsAuth: boolean = darkSocket?.data.authenticated
  const lightIsAuth: boolean = lightSocket?.data.authenticated

  if (!darkIsAuth || !lightIsAuth) {
    return false
  }

  try {
    await GameModel.create({
      dark: game.dark,
      light: game.light,
      darkId: game.darkId,
      lightId: game.lightId,

      board: game.board,
      moves: game.moves,

      useTimer: game.useTimer,
      initialTimer: game.initialTimer,
      timerIncrement: game.timerIncrement,
      timerDark: game.timerDark,
      timerLight: game.timerLight,

      finished: game.finished,
      endState: game.endState,
      winner: game.winner,

      gameType: game.gameType
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
  }, GAME_OVER_TTL * 1000)

  // and timer is removed
  const gameTimer = chessTimers.get(roomID)
  if (gameTimer) gameTimer.stop()
  chessTimers.delete(roomID)

  // Then save in database
  if (game.gameType === GameType.COMPETITIVE) {
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
    const game = await getGame(roomID, async (game) => {
      if (!game) {
        console.log('Error at timeoutProtocol: No game with roomID:', roomID)
        return
      }

      if (winner === PlayerColor.LIGHT) {
        game.timerDark = 0
      } else {
        game.timerLight = 0
      }
      game.finished = true
      game.endState = EndState.TIMEOUT

      await setGame(roomID, game, true)
      return game
    })
    if (!game) return

    void endProtocol(io, roomID, game)

    const message: GameOverMsg = {
      winner,
      endState: EndState.TIMEOUT
    }

    io.to(roomID).emit('game_over', message)
  }
}

export const filterGameState = (msg: any): any => {
  delete msg.darkSocketId
  delete msg.darkId
  delete msg.lightSocketId
  delete msg.lightId

  if (!msg.useTimer) {
    delete msg.initialTimer
    delete msg.increment
    delete msg.timerDark
    delete msg.timerLight
  }

  if (!msg.finished) {
    delete msg.endState
    delete msg.winner
  }

  return msg
}

export const isPlayerOfGame = (
  socket: Socket,
  game: GameState
): boolean => {
  return (game.lightSocketId === socket.id ||
    game.darkSocketId === socket.id)
}

export const getColor = (
  socket: Socket,
  game: GameState
): PlayerColor => {
  return socket.id === game.lightSocketId
    ? PlayerColor.LIGHT
    : PlayerColor.DARK
}

export const alternativeColor = (
  color: PlayerColor
): PlayerColor => {
  return color === PlayerColor.DARK
    ? PlayerColor.LIGHT
    : PlayerColor.DARK
}

interface CheckResult {
  useTimer: boolean
  error?: string
}

export const checkFindRoomMsgParameters = (
  data: FindRoomMsg
): CheckResult => {
  const res: CheckResult = { useTimer: true }

  if (!data.hostColor || data.hostColor === 'RANDOM') {
    if (Math.random() >= 0.5) {
      data.hostColor = PlayerColor.LIGHT
    } else {
      data.hostColor = PlayerColor.DARK
    }
  }

  if (!data.time) {
    data.time = 300 // default
  } else if (data.time === 0) {
    data.increment = undefined
    res.useTimer = false
  } else if (data.time < 0) {
    res.error = 'Initial timer value cannot be negative'
  } else {
    data.time = Math.trunc(data.time)
  }

  if (res.useTimer) {
    if (!data.increment) {
      data.increment = 5 // default
    } else if (data.increment < 0) {
      res.error = 'Timer increment value cannot be negative'
    } else {
      data.increment = Math.trunc(data.increment)
    }
  }
  return res
}
