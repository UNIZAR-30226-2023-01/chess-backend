import { Request, Response } from 'express'
import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import dayjs from 'dayjs'
import jwt from 'jsonwebtoken'
import UserModel from '../models/user'
import { setStatus } from '../../lib/status'
import { client, redlock } from '../../config/database'

export const signIn = (req: Request, res: Response): void => {
  UserModel.getUser(req.body.username)
    .then((user: any) => {
      pbkdf2(req.body.password, user.salt, 310000, 64, 'sha512', (err, derivedKey): Response => {
        if (err != null) {
          return res
            .status(500)
            .json(setStatus(req, 500, 'Internal server error'))
        }

        if (!timingSafeEqual(user.password, derivedKey)) {
          return res
            .status(401)
            .json(setStatus(req, 401, 'Invalid credentials'))
        }

        const payload = {
          id: user._id,
          username: user.username
        }

        const token = jwt.sign(payload, String(process.env.JWT_SECRET), { expiresIn: '1h' })
        res.cookie('api-auth', token, {
          httpOnly: true,
          secure: false,
          expires: dayjs().add(7, 'days').toDate()
        })

        return res
          .status(200)
          .json(Object.assign({}, { data: user.toJSON() }, setStatus(req, 200, 'User logged in successfully')))
      })
    }).catch(_ => {
      return res
        .status(500)
        .json(setStatus(req, 500, 'Internal server error'))
    })
}

export const signUp = (req: Request, res: Response): void => {
  const salt = randomBytes(16)
  pbkdf2(req.body.password, salt, 310000, 64, 'sha512', (err, derivedKey) => {
    if (err != null) console.error(err)

    console.log('User created', req.body)

    UserModel.create({
      username: req.body.username,
      email: req.body.email,
      password: derivedKey,
      salt
    })
      .then((user) => {
        res
          .status(201)
          .json(Object.assign({}, { data: user.toJSON() }, setStatus(req, 0, 'User created successfully')))
      })
      .catch((err) => {
        console.error(err)
        res
          .status(500)
          .json(setStatus(req, 500, 'Internal server error'))
      })
  })
}

export const signOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const blacklist = 'token-blacklist'
    const authToken = req.cookies['api-auth']

    const expTime = 60 * 60 * 5 // segundos de expiracion

    let lock = await redlock.acquire([blacklist + '-lock'], 5000) // LOCK
    console.log(blacklist + '-lock: AQUIRED')
    try {
      const record = await client.get(blacklist)
      lock = await lock.extend(5000) // EXTEND
      console.log('Record: ', record)

      if (record !== null) {
        const parsedData = JSON.parse(record)
        parsedData[blacklist].push(authToken)
        await client.setex(blacklist, expTime, JSON.stringify(parsedData))

        console.log('Data: ', parsedData)
      } else {
        const blacklistedData = {
          [blacklist]: [authToken]
        }

        await client.setex(blacklist, expTime, JSON.stringify(blacklistedData))
      }
    } finally {
      await lock.release() // UNLOCK
      console.log(blacklist + '-lock: RELEASED')
    }
    res
      .clearCookie('api-auth')
      .status(200)
      .json({ message: 'Good Bye!' })
  } catch (err) {
    console.log('Error: ', err)
    res
      .status(500)
      .json({ message: 'Internal Server Error!' })
  }
}

export const verify = (req: Request, res: Response): void => {
  res
    .status(200)
    .json(setStatus(req, 200, 'User Authorized'))
}
