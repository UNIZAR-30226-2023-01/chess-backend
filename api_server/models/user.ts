import { model, Schema, Document } from 'mongoose'

export enum ReservedUsernames {
  GUEST_USER = 'Guest',
  AI_USER = 'AI',
  DEV_USER_1 = 'dev1',
  DEV_USER_2 = 'dev2'
}

export interface UserDocument extends Document {
  googleId: string
  username: string
  email: string
  avatar: string
  password: Buffer
  salt: Buffer
  verified: boolean
  removed: boolean
  elo: number
  board: string
  lightPieces: string
  darkPieces: string
  createdAt: Date
  updatedAt: Date
  stats: {
    bulletWins: number
    bulletDefeats: number
    bulletDraws: number
    blitzWins: number
    blitzDefeats: number
    blitzDraws: number
    fastWins: number
    fastDefeats: number
    fastDraws: number
  }
  achievements: string[]
}

const userSchema = new Schema<UserDocument>({
  googleId: {
    type: String,
    required: false
  },
  username: {
    type: String,
    unique: true,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  avatar: {
    type: String,
    default: '/animales/1.webp'
  },
  password: {
    type: Buffer,
    require: true
  },
  salt: {
    type: Buffer,
    require: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  removed: {
    type: Boolean,
    default: false
  },
  elo: {
    type: Number,
    default: 800
  },
  board: {
    type: String,
    default: 'wood'
  },
  lightPieces: {
    type: String,
    default: 'medieval'
  },
  darkPieces: {
    type: String,
    default: 'medieval'
  },
  stats: {
    type: new Schema({
      bulletWins: {
        type: Number,
        default: 0
      },
      bulletDefeats: {
        type: Number,
        default: 0
      },
      bulletDraws: {
        type: Number,
        default: 0
      },
      blitzWins: {
        type: Number,
        default: 0
      },
      blitzDefeats: {
        type: Number,
        default: 0
      },
      blitzDraws: {
        type: Number,
        default: 0
      },
      fastWins: {
        type: Number,
        default: 0
      },
      fastDefeats: {
        type: Number,
        default: 0
      },
      fastDraws: {
        type: Number,
        default: 0
      }
    }),
    default: {
      bulletWins: 0,
      bulletDefeats: 0,
      bulletDraws: 0,
      blitzWins: 0,
      blitzDefeats: 0,
      blitzDraws: 0,
      fastWins: 0,
      fastDefeats: 0,
      fastDraws: 0
    }
  },
  achievements: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
})

export const UserModel = model<UserDocument>('User', userSchema)
