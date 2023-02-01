import { Request, Response } from 'express'
import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import dayjs from 'dayjs'
import jwt from 'jsonwebtoken'
import UserModel from '../models/user'

export const signIn = (req: Request, res: Response): void => {
  UserModel.getUser(req.body.username)
    .then((user: any) => {
      pbkdf2(req.body.password, user.salt, 310000, 64, 'sha512', (err, derivedKey) => {
        if (err != null) {
          console.error(err)
          return
        }
        if (!timingSafeEqual(user.password, derivedKey)) console.error('Incorrect username or password.')
        else console.log('User logged in successfully')
      })

      const payload = {
        id: user._id,
        username: user.username
      }

      const token = jwt.sign(payload, process.env.JWT_SECRET ?? '', { expiresIn: '1h' })

      res.cookie('api-auth', token, {
        secure: false,
        httpOnly: true,
        expires: dayjs().add(7, 'days').toDate()
      })

      return res.status(200).json({
        message: 'user ' + String(user.username) + ' logged in successfully'
      })
    }).catch((error: any) => {
      console.error(error)
      return res.status(500).json({
        message: 'Internal server error'
      })
    })
}

export const signUp = (req: Request, res: Response): void => {
  const salt = randomBytes(16)
  pbkdf2(req.body.password, salt, 310000, 64, 'sha512', (err, derivedKey) => {
    if (err != null) console.error(err)

    UserModel.create({
      username: req.body.username,
      password: derivedKey,
      salt
    })
      .then(() => console.log('User saved successfully'))
      .catch((error: any) => console.error(error))
  })

  res.send('User created')
}

export const signOut = (_req: Request, res: Response): void => {
  res.clearCookie('api-auth')
  res.send('User logged out')
}
