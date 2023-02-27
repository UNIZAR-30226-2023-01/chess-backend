import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import { createClient } from 'redis'

dotenv.config()

mongoose.set('strictQuery', true)
export const connectDB = async (): Promise<void> => {
  await mongoose.connect(String(process.env.DATABASE_URI))
    .catch((err) => console.error(err))
}
mongoose.Promise = global.Promise
mongoose.connection.on('error', (err) => {
  console.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${String(err.message)}`)
})

export const client = createClient({
  url: String(process.env.REDIS_URI)
})

client.on('error', (error) => {
  console.log('Redis Error: ', error)
})

client.on('connect', () => {
  console.log('Redis Connected!')
})

export const connectRedis = async (): Promise<void> => {
  console.log('Connecting to Redis...')
  await client.connect()
}
