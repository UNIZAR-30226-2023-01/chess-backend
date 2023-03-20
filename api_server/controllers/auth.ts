import { Request, Response } from 'express'
import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import dayjs from 'dayjs'
import jwt from 'jsonwebtoken'
import UserModel from '@models/user'
import { setStatus } from '@lib/status'
import { invalidateToken } from '@lib/token-blacklist'

export const signIn = (req: Request, res: Response): void => {
  UserModel.getUser(req.body.username)
    .then((user: any) => {
      pbkdf2(
        req.body.password,
        user.salt, 310000, 64, 'sha512',
        (err, derivedKey): Response => {
          if (err != null || !timingSafeEqual(user.password, derivedKey)) {
            return res
              .status(401)
              .json(setStatus(req, 401, 'Invalid credentials'))
          }

          const payload = {
            id: user._id,
            username: user.username
          }

          const token = jwt.sign(
            payload,
            String(process.env.JWT_SECRET),
            { expiresIn: '1h' }
          )

          res.cookie('api-auth', token, {
            httpOnly: true,
            secure: false,
            expires: dayjs().add(7, 'days').toDate()
          })

          return res
            .status(200)
            .json(Object.assign({}, { data: user.toJSON() },
              setStatus(req, 200, 'User logged in successfully')))
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
      email: req.body.email,
      password: derivedKey,
      salt
    })
      .then((user) => {
        res
          .status(201)
          .json(Object.assign({}, { data: user.toJSON() },
            setStatus(req, 0, 'User created successfully')))
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
    const authToken = req.cookies['api-auth']
    await invalidateToken(String(req.body.user.username), authToken)
    res
      .clearCookie('api-auth')
      .status(200)
      .json({ message: 'Good Bye!' })
  } catch (err) {
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

export const forgotPassword = (req: Request, res: Response): void => {
  const { email } = req.body
  UserModel.getUserByEmail(email)
    .then((user: any) => {
      if (!user) {
        return res
          .status(404)
          .json(setStatus(req, 404, 'User not found'))
      }

      const { _id: id, email } = user.toJSON()
      const secret = String(process.env.JWT_SECRET) + String(user.password.toString('hex'))
      const payload = { id, email }
      const token = jwt.sign(payload, secret, { expiresIn: '15m' })
      const url = `${req.protocol}://${req.get('host') ?? req.hostname}/reset-password/${String(id)}/${token}`

      return res
        .status(500)
        .json({
          data: { id, url },
          status: setStatus(req, 200, 'OK')
        })
    })
    .catch(_ => {
      return res
        .status(500)
        .json(setStatus(req, 500, 'Internal server error'))
    })
}

export const resetPassword = (req: Request, res: Response): void => {
  const { id, token } = req.params

  UserModel.getUserById(id)
    .then((user: any) => {
      if (!user) {
        return res
          .status(404)
          .json(setStatus(req, 404, 'User not found'))
      }

      const secret = String(process.env.JWT_SECRET) + String(user.password.toString('hex'))
      const data = jwt.verify(token, secret)

      return res
        .status(200)
        .json({
          data,
          status: setStatus(req, 200, 'OK')
        })
    })
    .catch(() => {
      return res
        .status(500)
        .json(setStatus(req, 500, 'Internal server error'))
    })
}

export const changePassword = (req: Request, res: Response): void => {
  const { id, token } = req.params
  const salt = randomBytes(16)

  UserModel.getUserById(id)
    .then((user: any) => {
      if (!user) {
        return res
          .status(404)
          .json(setStatus(req, 404, 'User not found'))
      }

      const secret = String(process.env.JWT_SECRET) + String(user.password.toString('hex'))
      jwt.verify(token, secret)
      return null
    })
    .catch(() => {
      return res
        .status(500)
        .json(setStatus(req, 500, 'Internal server error'))
    })

  pbkdf2(req.body.password, salt, 310000, 64, 'sha512', (err, derivedKey) => {
    if (err != null) console.error(err)
    UserModel.findByIdAndUpdate({ _id: id }, {
      password: derivedKey,
      salt
    })
      .then(() => {
        res
          .status(201)
          .json(setStatus(req, 0, 'Password changed'))
      })
      .catch((err) => {
        console.error(err)
        res
          .status(500)
          .json(setStatus(req, 500, 'Internal server error'))
      })
  })
}
