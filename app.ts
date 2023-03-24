import express from 'express'
import { connectDB } from '@config/database'
import path from 'path'
import helmet from 'helmet'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import { stamp } from '@middlewares/timestamp'
import indexRouter from '@routes/index'
import authRouter from '@routes/auth'
import usersRouter from '@routes/users'
import historyRouter from '@routes/history'
import tournamentsRouter from '@routes/tournaments'
import cors from 'cors'
import * as dotenv from 'dotenv'
import passport from 'passport'
import cookieSession from 'cookie-session'
import server from '@server'
dotenv.config()
require('@auth/passport')
require('@auth/passportGoogle')
console.log('process.env.NODE_ENV', process.env.NODE_ENV)

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors({
  origin: ['https://cdn.redoc.ly', 'https://reign.gracehopper.xyz'],
  credentials: true
}))
app.use(helmet({
  contentSecurityPolicy: false
}))
app.use(cookieParser())
app.use(cookieSession({
  name: 'api-auth',
  secret: String(process.env.JWT_SECRET),
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.gracehopper.xyz' : undefined
}))
app.use(passport.initialize())
app.use(passport.session())

app.use(express.static(path.join(__dirname, 'public')))

const PORT = process.env.PORT ?? 4000
app.listen(PORT, () => {
  console.log(`Server is running → PORT ${String(PORT)}`)
  connectDB()
    .then(() => console.log('MongoDB has been connected'))
    .catch((err) => console.error(err))
})

app.use('/api/v1', stamp)
app.use('/api/v1', indexRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/history', historyRouter)
app.use('/api/v1/tournaments', tournamentsRouter)

server.listen(Number(PORT) + 1, () => {
  console.log(`Socket.IO is running → PORT ${String(Number(PORT) + 1)}`)
})

export default app
