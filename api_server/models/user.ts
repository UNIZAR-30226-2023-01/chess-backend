import { model, Schema, Document, Model } from 'mongoose'

export interface UserDocument extends Document {
  username: string
  password: Buffer
  salt: Buffer
}

interface User {
  username: string
  password: Buffer
  salt: Buffer
}

interface UserModel extends Model<User> {
  doesUserExist: (username: string) => Promise<Boolean>
  getUser: (username: string) => Promise<User>
}

const userSchema = new Schema<User, UserModel>({
  username: {
    type: String,
    required: true
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

userSchema.static('doesUserExist', async function (username): Promise<Boolean> {
  return await this.findOne({ username })
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
