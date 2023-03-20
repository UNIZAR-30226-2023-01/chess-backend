import { model, Schema, Document, Model } from 'mongoose'

export const guestUser = 'guest'

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
  getUser: (username: string) => Promise<User | null>
  getUserByEmail: (email: string) => Promise<User | null>
  getUserById: (id: string) => Promise<User | null>
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

userSchema.static('doesUserExist',
  async function (username: string, email: string): Promise<Boolean> {
    try {
      const user = await this.findOne({
        $or: [
          { username },
          { email }
        ]
      })
      return user !== null
    } catch (error: any) {
      console.error(error)
      return false
    }
  })

userSchema.static('getUser',
  async function (username: string): Promise<User | null> {
    try {
      return await this.findOne({ username })
    } catch (error: any) {
      console.error(error)
      return null
    }
  })

userSchema.static('getUserByEmail',
  async function (email: string): Promise<User | null> {
    try {
      return await this.findOne({ email })
    } catch (error: any) {
      console.error(error)
      return null
    }
  })

userSchema.static('getUserById',
  async function (id: string): Promise<User | null> {
    try {
      return await this.findById({ _id: id })
    } catch (error: any) {
      console.error(error)
      return null
    }
  })

const UserInstance = model<User, UserModel>('User', userSchema)
export default UserInstance
