import { Socket } from 'socket.io'
import { EndState, GameState, GameType, PlayerColor, State } from '@lib/types/game'
import { client, redlock } from '@config/database'
import { chessTimers } from '@lib/timer'
import { FindRoomMsg, FoundRoomMsg, GameOverMsg } from '@lib/types/socket-msg'
import { GameModel } from '@models/game'
import { composeLock, compose, ResourceName } from '@lib/namespaces'
import * as roomLib from '@lib/room'
import * as tournLib from '@lib/tournament'
import { Types } from 'mongoose'
import { ReservedUsernames, UserModel } from '@models/user'
import { io } from '@server'
import * as achievement from '@lib/achievements'
import { MatchResult, updateEloOfUsers } from '@lib/elo'
import * as logger from '@lib/logger'
import _ from 'lodash'

// 2 minutes after a game is over, it is deleted from redis
export const GAME_OVER_TTL = 2 * 60

export const getGame = async (
  roomID: string,
  action?: (game?: GameState) => Promise<GameState | undefined>
): Promise<GameState | undefined> => {
  const lockName = composeLock(ResourceName.ROOM, roomID)
  const resource = compose(ResourceName.ROOM, roomID)

  let game: GameState | undefined
  let lock = null
  while (!lock) {
    try {
      lock = await redlock.acquire([lockName], 20000) // LOCK
      const rawGame = await client.get(resource)
      try {
        if (!rawGame) game = undefined
        else game = JSON.parse(rawGame)
      } catch (err) { return undefined }

      lock = await lock.extend(20000) // EXTEND
      if (action) {
        game = await action(game)
      }
    } catch (err) {
      logger.error(String(err))
    } finally {
      // This block executes even if a return statement is called
      if (lock) await lock.release() // UNLOCK
    }
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

export const unsetGame = async (
  roomID: string
): Promise<void> => {
  const resource = compose(ResourceName.ROOM, roomID)
  await client.del(resource)
}

export const canGameBeStored = (
  game: GameState
): boolean => {
  const darkSocket = io.sockets.sockets.get(game.darkSocketId)
  const lightSocket = io.sockets.sockets.get(game.lightSocketId)

  const darkIsAuth: boolean = darkSocket?.data.authenticated
  const lightIsAuth: boolean = lightSocket?.data.authenticated

  return darkIsAuth || lightIsAuth || game.gameType === GameType.TOURNAMENT
}

export const newGameInDB = async (
  game: GameState,
  roomID: string
): Promise<Types.ObjectId | null> => {
  if (!canGameBeStored(game)) return null

  let id: Types.ObjectId | null

  try {
    const doc = await GameModel.create({
      darkId: game.darkId,
      lightId: game.lightId,

      board: game.board,
      moves: game.moves,

      initialTimer: game.initialTimer,
      timerIncrement: game.timerIncrement,
      timerDark: game.timerDark,
      timerLight: game.timerLight,

      gameType: game.gameType,
      state: State.NOT_STARTED,
      endState: game.endState,
      winner: game.winner,
      roomID
    })

    id = doc._id
  } catch (err: any) {
    logger.error(err)
    return null
  }

  return id
}

export const startGameInDB = async (
  game: GameState,
  roomID: string
): Promise<boolean> => {
  if (!canGameBeStored(game)) return true

  try {
    await GameModel.updateOne({ roomID }, {
      $set: { state: State.PLAYING, lightId: game.lightId, darkId: game.darkId }
    })
  } catch (err: any) {
    logger.error(err)
    return false
  }

  return true
}

export const pauseGameInDB = async (
  game: GameState,
  roomID: string
): Promise<boolean> => {
  if (!canGameBeStored(game)) return true

  updateGameTimer(roomID, game)

  try {
    await GameModel.updateOne({ roomID }, {
      $set: {
        darkId: game.darkId,
        lightId: game.lightId,
        board: game.board,
        moves: game.moves,
        initialTimer: game.initialTimer,
        timerIncrement: game.timerIncrement,
        timerDark: game.timerDark,
        timerLight: game.timerLight,
        gameType: game.gameType,
        state: State.PAUSED,
        endState: game.endState,
        winner: game.winner
      },
      $unset: { roomID: '' }
    })
  } catch (err: any) {
    logger.error(err)
    return false
  }

  return true
}

export const resumeGameInDB = async (
  game: GameState,
  gameID: Types.ObjectId,
  roomID: string
): Promise<boolean> => {
  if (!canGameBeStored(game)) return true

  try {
    await GameModel.updateOne({ _id: gameID }, {
      $set: { state: State.RESUMING, roomID }
    })
  } catch (err: any) {
    logger.error(err)
    return false
  }

  return true
}

interface GameAndState {
  game: GameState
  state: State
  roomID?: string
}

export const getGameStateFromDB = async (
  id: Types.ObjectId
): Promise<GameAndState | undefined> => {
  let game: GameState
  let state: State
  let roomID: string | undefined

  try {
    const gameData = await GameModel.findById(id)
    if (!gameData ||
      (gameData.gameType !== GameType.CUSTOM &&
      gameData.gameType !== GameType.AI)) return undefined

    const dark = (await UserModel.findById(gameData.darkId))?.username
    const light = (await UserModel.findById(gameData.lightId))?.username
    const alternativeName = (gameData.gameType === GameType.CUSTOM)
      ? ReservedUsernames.GUEST_USER
      : ReservedUsernames.AI_USER

    game = {
      turn: gameData.moves.length % 2 === 0 ? PlayerColor.LIGHT : PlayerColor.DARK,
      darkSocketId: '',
      lightSocketId: '',
      darkId: gameData.darkId,
      lightId: gameData.lightId,
      dark: dark ?? alternativeName,
      light: light ?? alternativeName,
      board: gameData.board,
      moves: gameData.moves,
      useTimer: gameData.initialTimer !== undefined,
      initialTimer: gameData.initialTimer,
      timerIncrement: gameData.timerIncrement,
      timerDark: gameData.timerDark,
      timerLight: gameData.timerLight,
      finished: false,
      spectators: [],
      darkVotedDraw: false,
      lightVotedDraw: false,
      darkVotedSave: false,
      lightVotedSave: false,
      darkSurrended: false,
      lightSurrended: false,
      gameType: gameData.gameType
    }
    state = gameData.state
    roomID = gameData.roomID
  } catch (err: any) {
    logger.error(err)
    return undefined
  }

  return { game, state, roomID }
}

export const updateUserStats = async (
  game: GameState,
  userID: Types.ObjectId,
  color: PlayerColor
): Promise<void> => {
  let incProp = 'stats.'

  const isWinner = color === game.winner
  const isDraw = game.endState === EndState.DRAW
  switch (game.initialTimer) {
    case 180:
      incProp += 'bullet'
      break
    case 300:
      incProp += 'blitz'
      break
    case 600:
      incProp += 'fast'
      break
  }
  if (isDraw) incProp += 'Draws'
  else if (isWinner) incProp += 'Wins'
  else incProp += 'Defeats'

  const obj: { [key: string]: number } = {}
  obj[incProp] = 1

  await UserModel.findByIdAndUpdate(userID, { $inc: obj })
}

export const endGameInDB = async (
  game: GameState,
  roomID: string
): Promise<boolean> => {
  if (!canGameBeStored(game)) return true

  try {
    await GameModel.updateOne({ roomID }, {
      $set: {
        darkId: game.darkId,
        lightId: game.lightId,
        board: game.board,
        moves: game.moves,
        initialTimer: game.initialTimer,
        timerIncrement: game.timerIncrement,
        timerDark: game.timerDark,
        timerLight: game.timerLight,
        gameType: game.gameType,
        state: State.ENDED,
        endState: game.endState,
        winner: game.winner
      },
      $unset: { roomID: '' }
    })

    if (game.gameType === GameType.COMPETITIVE) {
      if (game.darkId) { void updateUserStats(game, game.darkId, PlayerColor.DARK) }
      if (game.lightId) { void updateUserStats(game, game.lightId, PlayerColor.LIGHT) }
      achievement.updateRankingAchievements().then(_ => {}).catch(_ => {})
    }
    if (game.darkId) {
      achievement
        .afterGameAchievementsCheck(game.darkId, game.gameType)
        .then(_ => {}).catch(_ => {})
    }
    if (game.lightId) {
      achievement
        .afterGameAchievementsCheck(game.lightId, game.gameType)
        .then(_ => {}).catch(_ => {})
    }
  } catch (err: any) {
    logger.error(err)
    return false
  }

  return true
}

interface MatchGameOverMsg {
  darkMsg: GameOverMsg
  lightMsg: GameOverMsg
}

export const updateElo = async (
  game: GameState,
  message: GameOverMsg
): Promise<MatchGameOverMsg | undefined> => {
  const darkMsg = _.cloneDeep(message)
  const lightMsg = _.cloneDeep(message)

  if (game.gameType === GameType.COMPETITIVE &&
    game.lightId && game.darkId) {
    const resultForLight = ((): MatchResult => {
      if (game.winner) {
        if (game.winner === PlayerColor.LIGHT) {
          return MatchResult.VICTORY
        }
        return MatchResult.DEFEAT
      }
      return MatchResult.DRAW
    })()

    const newElo = await updateEloOfUsers(game.lightId, game.darkId, resultForLight)
    if (newElo) {
      lightMsg.eloDiff = newElo.eloDiffA
      lightMsg.newElo = newElo.newEloPlayerA
      darkMsg.eloDiff = newElo.eloDiffB
      darkMsg.newElo = newElo.newEloPlayerB
      return { darkMsg, lightMsg }
    }
  }
  return undefined
}

export const removeTimer = (roomID: string): void => {
  const gameTimer = chessTimers.get(roomID)
  if (gameTimer) {
    gameTimer.stop()
    chessTimers.delete(roomID)
  }
}

export const endProtocol = async (
  roomID: string,
  game: GameState,
  message: GameOverMsg
): Promise<void> => {
  const eloMsg = await updateElo(game, message)
  if (eloMsg) {
    io.to(roomID)
      .except([game.darkSocketId, game.lightSocketId])
      .emit('game_over', message)
    io.to(game.lightSocketId).emit('game_over', eloMsg.lightMsg)
    io.to(game.darkSocketId).emit('game_over', eloMsg.darkMsg)
  } else {
    io.to(roomID).emit('game_over', message)
  }

  // After a game is over every socket in the room is forced to leave
  io.in(roomID).socketsLeave(roomID)

  // and timer is removed
  removeTimer(roomID)

  // Then save in database
  if (!await endGameInDB(game, roomID)) {
    logger.error('Error at endGameInDB')
  }

  if (game.gameType === GameType.TOURNAMENT) {
    tournLib.endProtocol(roomID, game).catch(_ => _)
  }
}

export const timeoutProtocol = (
  roomID: string
): (winner: PlayerColor) => Promise<void> => {
  return async (winner: PlayerColor) => {
    const game = await getGame(roomID, async (game) => {
      if (!game) {
        logger.error('Error at timeoutProtocol: No game with roomID:' + roomID)
        return
      }

      if (winner === PlayerColor.LIGHT) {
        game.timerDark = 0
      } else {
        game.timerLight = 0
      }
      game.finished = true
      game.endState = EndState.TIMEOUT
      game.winner = winner

      await setGame(roomID, game, true)
      return game
    })
    if (!game) return

    const message: GameOverMsg = {
      winner,
      endState: EndState.TIMEOUT
    }

    await endProtocol(roomID, game, message)
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

export const isIdOnGame = (
  id: Types.ObjectId,
  game: GameState
): boolean => {
  let isLightPlayer = false
  let isDarkPlayer = false
  if (game.lightId) {
    isLightPlayer = id.equals(game.lightId)
  }
  if (game.darkId) {
    isDarkPlayer = id.equals(game.darkId)
  }

  return isLightPlayer || isDarkPlayer
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

type Any<T> = {
  [P in keyof T]: any
}

export const checkRoomCreationMsg = (
  data: Any<FindRoomMsg>
): CheckResult => {
  const res: CheckResult = { useTimer: true }

  if (data.hostColor === undefined || data.hostColor === 'RANDOM') {
    if (Math.random() >= 0.5) {
      data.hostColor = PlayerColor.LIGHT
    } else {
      data.hostColor = PlayerColor.DARK
    }
  } else if (!Object.values(PlayerColor).includes(data.hostColor)) {
    const value: string = data.hostColor.toString()
    res.error = `Host color "${value}" is not a valid option`
  }

  if (data.time === undefined) {
    data.time = 300 // default
  } else {
    data.time = parseInt(data.time)
    if (isNaN(data.time)) {
      res.error = 'Initial timer is not a number'
    } else if (data.time <= 0) {
      res.error = 'Initial timer must be a positive integer'
    }

    // Change last 'else if' to the following code to enable timerless games

    /*
    else if (data.time === 0) {
      data.increment = undefined
      res.useTimer = false
    } else if (data.time < 0) {
      res.error = 'Initial timer value cannot be negative'
    }
    */
  }

  if (res.useTimer) {
    if (data.increment === undefined) {
      data.increment = 5 // default
    } else {
      data.increment = parseInt(data.increment)
      if (isNaN(data.increment)) {
        res.error = 'Timer increment is not a number'
      } else if (data.increment < 0) {
        res.error = 'Timer increment value cannot be negative'
      }
    }
  }
  return res
}

export const updateGameTimer = (
  roomID: string,
  game: GameState
): boolean => {
  if (game.useTimer && !game.finished) {
    const gameTimer = chessTimers.get(roomID)
    if (!gameTimer) {
      return false
    }
    game.timerDark = gameTimer.getTimeDark()
    game.timerLight = gameTimer.getTimeLight()
  }
  return true
}

export const isSocketInGame = (socket: Socket): boolean => {
  return roomLib.getGameRoom(socket) !== null
}

export const createFoundRoomMsg = (
  socketID: string,
  roomID: string,
  game: GameState
): FoundRoomMsg => {
  const msg: FoundRoomMsg = Object.assign({
    roomID,
    color: socketID === game.darkSocketId
      ? PlayerColor.DARK
      : PlayerColor.LIGHT
  }, game)

  return filterGameState(msg)
}

export const isGameStarted = (
  game: GameState
): boolean => {
  return game.darkSocketId !== '' && game.lightSocketId !== ''
}
