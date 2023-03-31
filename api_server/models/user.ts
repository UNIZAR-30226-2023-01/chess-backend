import { model, Schema, Document } from 'mongoose'

export enum ReservedUsernames {
  GUEST_USER = 'Guest',
  AI_USER = 'AI'
}

export interface UserDocument extends Document {
  googleId: string
  username: string
  email: string
  avatar: string
  password: Buffer
  salt: Buffer
  verified: boolean
  elo: number
  board: string
  lightPieces: string
  darkPieces: string
  createdAt: Date
  updatedAt: Date
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
    default: 'avatar'
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
    default: 'classic'
  },
  darkPieces: {
    type: String,
    default: 'classic'
  }
}, {
  timestamps: true
})

export const UserModel = model<UserDocument>('User', userSchema)
