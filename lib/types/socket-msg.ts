import { EndState, GameState, GameType, PlayerColor } from '@lib/types/game'

export interface RoomIDMsg {
  roomID: string
}

export interface GameIDMsg {
  gameID: string
}

export interface GameOverMsg {
  endState: EndState
  winner?: PlayerColor
  newElo?: number
  eloDiff?: number
}

export interface MoveMsg {
  roomID: string
  move: string
}

export interface MovedMsg {
  timerDark?: number
  timerLight?: number

  move: string
  turn: PlayerColor
}

export type FoundRoomMsg = Partial<GameState> & {
  roomID: string
  color: PlayerColor
}

export interface FindRoomMsg {
  gameType: GameType
  roomID?: string
  matchID?: string
  time?: number // seconds
  increment?: number // seconds
  hostColor?: PlayerColor | 'RANDOM'
  difficulty?: number
}
