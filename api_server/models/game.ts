import { EndState, GameType, PlayerColor, State } from '@lib/types/game'
import { model, Schema, Document, Types } from 'mongoose'

export interface GameDocument extends Document {
  darkId?: Types.ObjectId
  lightId?: Types.ObjectId
  board: string // FEN codification of board state
  moves: string[] // UCI LAN format
  initialTimer?: number
  timerIncrement?: number
  timerDark?: number
  timerLight?: number

  gameType: GameType
  state: State
  endState?: EndState
  winner?: PlayerColor
  roomID?: string

  createdAt: Date
  updatedAt: Date
}

const gameSchema = new Schema<GameDocument>({
  darkId: {
    type: Types.ObjectId,
    ref: 'User'
  },
  lightId: {
    type: Types.ObjectId,
    ref: 'User'
  },
  board: {
    type: String,
    required: true
  },
  moves: {
    type: [String],
    required: true
  },
  initialTimer: {
    type: Number
  },
  timerIncrement: {
    type: Number
  },
  timerDark: {
    type: Number
  },
  timerLight: {
    type: Number
  },

  winner: {
    type: String
  },
  gameType: {
    type: String, // GameType
    required: true
  },
  state: {
    type: String,
    required: true
  },
  endState: {
    type: String
  },
  roomID: {
    type: String
  }
}, {
  timestamps: true
})

export const GameModel = model<GameDocument>('Game', gameSchema)
