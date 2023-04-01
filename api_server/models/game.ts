import { model, Schema, Document } from 'mongoose'

export interface GameDocument extends Document {
  darkId?: Schema.Types.ObjectId
  lightId?: Schema.Types.ObjectId
  board: string // FEN codification of board state
  moves: string[] // UCI LAN format
  initialTimer?: number
  timerIncrement?: number
  timerDark?: number
  timerLight?: number
  finished: boolean
  endState?: 'CHECKMATE' | 'DRAW' | 'TIMEOUT' | 'SURRENDER'
  winner?: 'LIGHT' | 'DARK'
  gameType: 'AI' | 'COMPETITIVE' | 'CUSTOM'
  createdAt: Date
  updatedAt: Date
}

const gameSchema = new Schema<GameDocument>({
  darkId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  lightId: {
    type: Schema.Types.ObjectId,
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
  finished: {
    type: Boolean,
    required: true
  },
  endState: {
    type: String
  },
  winner: {
    type: String
  },
  gameType: {
    type: String, // GameType
    required: true
  }
}, {
  timestamps: true
})

export const GameModel = model<GameDocument>('Game', gameSchema)
