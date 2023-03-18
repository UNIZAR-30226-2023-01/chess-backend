import { EndState, GameState, PlayerColor } from '@models/game'

export interface RoomMessage {
  roomID: string
}

export interface GameOverMessage {
  end_state: EndState
  winner: PlayerColor
}

export interface MoveMessage {
  roomID: string
  move: string
}

export interface MoveResponse {
  timer_dark?: number
  timer_light?: number

  move: string
  turn: PlayerColor
  finished: boolean
  end_state?: EndState
  winner?: PlayerColor
}

export interface FindGameMsg {
  time: number // seconds
}

export type FoundGameMsg = Partial<GameState> & {
  roomID: string
  color: PlayerColor
}
