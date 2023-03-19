import { model, Schema, Document } from 'mongoose'

export interface GameDocument extends Document {
  darkId: Schema.Types.ObjectId
  lightId: Schema.Types.ObjectId
  board: string // FEN codification of board state
  moves: string[] // UCI LAN format

  useTimer: boolean
  initialTimer?: number
  timerIncrement?: number
  timerDark?: number
  timerLight?: number

  finished: boolean
  endState?: string
  winner?: string

  gameType: string
}

const gameSchema = new Schema<GameDocument>({
  darkId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  lightId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  board: {
    type: String,
    required: true
  },
  moves: {
    type: [String],
    required: true
  },

  useTimer: {
    type: Boolean,
    required: true
  },
  initialTimer: {
    type: Number,
    required: false
  },
  timerIncrement: {
    type: Number,
    required: false
  },
  timerDark: {
    type: Number,
    required: false
  },
  timerLight: {
    type: Number,
    required: false
  },

  finished: {
    type: Boolean,
    required: true
  },
  endState: {
    type: String,
    required: false
  },
  winner: {
    type: String,
    required: false
  },

  gameType: {
    type: String, // GameType
    required: true
  }
}, {
  timestamps: true
})

export const GameModel = model<GameDocument>('Game', gameSchema)
