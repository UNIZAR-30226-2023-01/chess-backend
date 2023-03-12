import { model, Schema, Document, Model } from 'mongoose'

export const guestUser = 'Anónimo'

export interface UserDocument extends Document {
  googleId: string
  username: string
  email: string
  avatar: string
  password: Buffer
  salt: Buffer
}

interface User {
  googleId: string
  username: string
  email: string
  avatar: string
  password: Buffer
  salt: Buffer
}

interface UserModel extends Model<User> {
  doesUserExist: (username: string, email: string) => Promise<Boolean>
  getUser: (username: string) => Promise<User>
}

const userSchema = new Schema<User, UserModel>({
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

userSchema.static('doesUserExist', async function (username, email): Promise<Boolean> {
  return await this.findOne({
    $or: [
      { username },
      { email }
    ]
  })
    .then((user: any) => user !== null)
    .catch((error: any) => {
      console.error(error)
      return false
    })
})

userSchema.static('getUser', async function (username): Promise<any> {
  return await this.findOne({ username })
    .then((user: any) => user)
    .catch((error: any) => {
      console.error(error)
      return null
    })
})

const UserInstance = model<User, UserModel>('User', userSchema)
export default UserInstance
