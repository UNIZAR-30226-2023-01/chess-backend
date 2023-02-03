import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
dotenv.config()

mongoose.set('strictQuery', true)
const connectDB = async (): Promise<void> => {
  await mongoose.connect(String(process.env.DATABASE_URI))
    .catch((err) => console.error(err))
}
mongoose.Promise = global.Promise
mongoose.connection.on('error', (err) => {
  console.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${String(err.message)}`)
})

export default connectDB
