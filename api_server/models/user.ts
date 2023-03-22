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
    required: false
  },
  password: {
    type: Buffer,
    require: true
  },
  salt: {
    type: Buffer,
    require: true
  }
}, {
  timestamps: true
})

export const UserModel = model<UserDocument>('User', userSchema)
