import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import Redis from 'ioredis'
import Redlock from 'redlock'

dotenv.config()

mongoose.set('strictQuery', true)
export const connectDB = async (): Promise<void> => {
  await mongoose.connect(String(process.env.MONGO_URI))
    .catch((err) => console.error(err))
}
mongoose.Promise = global.Promise
mongoose.connection.on('error', (err) => {
  console.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${String(err.message)}`)
})

export const client = new Redis(String(process.env.REDIS_URI))

client.on('error', (error) => {
  console.log('Redis Error: ', error)
})

client.on('connect', () => {
  console.log('Redis Connected!')
})

export const redlock = new Redlock(
  [client],
  {
    driftFactor: 0.01, // multiplied by lock ttl to determine drift time
    retryCount: 10,
    retryDelay: 100, // time in ms
    retryJitter: 200, // time in ms
    automaticExtensionThreshold: 500 // time in ms
  }
)
