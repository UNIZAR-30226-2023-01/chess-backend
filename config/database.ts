import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import Redis from 'ioredis'
import Redlock from 'redlock'
import * as logger from '@lib/logger'

dotenv.config()

mongoose.set('strictQuery', true)
export const connectDB = async (): Promise<void> => {
  await mongoose.connect(String(process.env.MONGO_URI))
    .catch((err) => logger.error(err))
}
mongoose.Promise = global.Promise
mongoose.connection.on('error', (err) => {
  logger.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${String(err.message)}`)
})

export const client = new Redis(String(process.env.REDIS_URI))

client.on('error', (error) => {
  logger.error('Redis Error: '); console.error(error)
})

client.on('connect', () => {
  logger.log('INFO', 'Redis Connected!')
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
