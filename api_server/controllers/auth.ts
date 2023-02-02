import { Request, Response } from 'express'
import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import dayjs from 'dayjs'
import jwt from 'jsonwebtoken'
import UserModel from '../models/user'
import { setStatus } from '../../lib/status'

export const signIn = (req: Request, res: Response): void => {
  UserModel.getUser(req.body.username)
    .then((user: any) => {
      pbkdf2(req.body.password, user.salt, 310000, 64, 'sha512', (err, derivedKey) => {
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
          secure: false,
          httpOnly: true,
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

    UserModel.create({
      username: req.body.username,
      password: derivedKey,
      salt
    })
      .then((user) => {
        res
          .status(201)
          .json(Object.assign({}, { data: user.toJSON() }, setStatus(req, 0, 'User created successfully')))
      })
      .catch((_) => {
        res
          .status(500)
          .json(setStatus(req, 500, 'Internal server error'))
      })
  })
}

export const signOut = (req: Request, res: Response): void => {
  res.clearCookie('api-auth')
  res
    .status(200)
    .json(setStatus(req, 200, 'User logged out successfully'))
}
