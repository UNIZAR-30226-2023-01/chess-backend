import { Schema } from 'mongoose'

// Board to test checkmate with tomato and the lettucero horse
// Next two moves: [f1g1, a8h8]
// export const START_BOARD = 'r7/pb3kb1/1p2p3/2nP2q1/8/2N5/PPP2P2/R4R1K w - - 3 24'

export const START_BOARD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export enum GameType {
  COMPETITIVE = 'COMPETITIVE',
  CUSTOM = 'CUSTOM',
  AI = 'AI',
  TOURNAMENT = 'TOURNAMENT'
}

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

export enum State {
  PAUSED = 'PAUSED',
  RESUMING = 'RESUMING',
  PLAYING = 'PLAYING',
  NOT_STARTED = 'NOT STARTED',
  ENDED = 'ENDED'
}

/**
 * State of a game stored in ram database
 */
export interface GameState {
  turn: PlayerColor
  darkSocketId: string
  lightSocketId: string
  darkId?: Schema.Types.ObjectId
  lightId?: Schema.Types.ObjectId

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
  difficulty?: number
}
