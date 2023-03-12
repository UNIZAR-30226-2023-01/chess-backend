import { model, Schema, Document } from 'mongoose'

export const newBoard = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export enum GameType {
  COMPETITIVE = 'COMPETITIVE',
  CUSTOM = 'CUSTOM'
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

export interface GameDocument extends Document {
  dark: string
  light: string
  board: string // FEN codification of board state
  moves: string[] // UCI LAN format

  use_timer: boolean
  initial_timer: number
  timer_dark: number
  timer_light: number

  finished: boolean
  end_state: string
  winner: string

  game_type: string
}

/**
 * State of a game stored in ram database
 */
export interface GameState {
  turn: PlayerColor
  dark_socket_id: string
  light_socket_id: string

  dark: string
  light: string
  board: string // FEN codification of board state
  moves: string[] // UCI LAN format

  use_timer: boolean
  initial_timer: number // seconds
  increment: number // seconds
  timer_dark: number // milliseconds
  timer_light: number // milliseconds

  finished: boolean
  end_state: EndState | undefined
  winner: PlayerColor | undefined

  spectators: string[]

  dark_voted_draw: boolean
  light_voted_draw: boolean

  dark_voted_save: boolean
  light_voted_save: boolean

  dark_surrended: boolean
  light_surrended: boolean

  game_type: GameType
}

const gameSchema = new Schema<GameDocument>({
  dark: {
    type: String,
    required: true
  },
  light: {
    type: String,
    required: true
  },
  board: {
    type: String,
    required: true
  },
  moves: {
    type: [String],
    required: true
  },

  use_timer: {
    type: Boolean,
    required: true
  },
  initial_timer: {
    type: Number,
    required: false
  },
  timer_dark: {
    type: Number,
    required: false
  },
  timer_light: {
    type: Number,
    required: false
  },

  finished: {
    type: Boolean,
    required: true
  },
  end_state: {
    type: String,
    required: false
  },
  winner: {
    type: String,
    required: false
  },

  game_type: {
    type: String, // GameType
    required: true
  }
}, {
  timestamps: true
})

export const GameModel = model<GameDocument>('Game', gameSchema)
