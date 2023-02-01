import * as dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config()

const CONNECTION_URI = process.env.DATABASE_URI ?? 'mongodb://localhost:27017/example'

console.log('Connecting to database...', process.env.DATABASE_URI)

const connectDB = async (): Promise<void> => {
  mongoose.set('strictQuery', true)
  await mongoose.connect(CONNECTION_URI)
    .then(() => console.log('MongoDB has been connected'))
    .catch((err) => console.error(err))
}

export default connectDB
