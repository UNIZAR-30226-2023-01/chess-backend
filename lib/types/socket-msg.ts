import { EndState, GameState, GameType, PlayerColor } from '@lib/types/game'

export interface RoomIDMsg {
  roomID: string
}

export interface GameOverMsg {
  endState: EndState
  winner?: PlayerColor
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
  finished: boolean
  endState?: EndState
  winner?: PlayerColor
}

export type FoundRoomMsg = Partial<GameState> & {
  roomID: string
  color: PlayerColor
}

export interface FindRoomMsg {
  gameType: GameType
  roomID?: string
  time?: number // seconds
  increment?: number // seconds
  hostColor?: PlayerColor | 'RANDOM'
}
