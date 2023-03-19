import { Types } from 'mongoose'

export const START_BOARD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export enum GameType {
  COMPETITIVE = 'COMPETITIVE',
  CUSTOM = 'CUSTOM',
  AI = 'AI',
  TOURNAMENT = 'TOURNAMENT'
}

/*
export enum NewGameType {
  CREATE_CUSTOM = 'CREATE_CUSTOM',
  JOIN_CUSTOM = 'JOIN_CUSTOM'
}
*/

export enum PlayerColor {
  LIGHT = 'LIGHT',
  DARK = 'DARK'
}

export enum EndState {
  CHECKMATE = 'CHECKMATE',
  DRAW = 'DRAW',
  TIMEOUT = 'TIMEOUT',
  SURRENDER = 'SURRENDER'
}

/**
 * State of a game stored in ram database
 */
export interface GameState {
  turn: PlayerColor
  darkSocketId: string
  lightSocketId: string
  darkId?: Types.ObjectId
  lightId?: Types.ObjectId

  dark: string
  light: string
  board: string // FEN codification of board state
  moves: string[] // UCI LAN format

  useTimer: boolean
  initialTimer?: number // seconds
  timerIncrement?: number // seconds
  timerDark?: number // milliseconds
  timerLight?: number // milliseconds

  finished: boolean
  endState?: EndState
  winner?: PlayerColor

  spectators: string[]

  darkVotedDraw: boolean
  lightVotedDraw: boolean

  darkVotedSave: boolean
  lightVotedSave: boolean

  darkSurrended: boolean
  lightSurrended: boolean

  gameType: GameType
}
