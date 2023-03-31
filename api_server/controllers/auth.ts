import { Request, Response } from 'express'
import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import dayjs from 'dayjs'
import jwt from 'jsonwebtoken'
import { UserModel } from '@models/user'
import { setStatus } from '@lib/status'
import { invalidateToken } from '@lib/token-blacklist'
import { parseUser } from '@lib/parsers'

export const signUp = (req: Request, res: Response): void => {
  const salt = randomBytes(16)
  pbkdf2(req.body.password, salt, 310000, 64, 'sha512', (err, derivedKey) => {
    if (err) return res.status(409).json({ status: setStatus(req, 409, 'Conflict') })

    return UserModel.create({
      username: req.body.username,
      email: req.body.email,
      password: derivedKey,
      salt
    })
      .then((user) => {
        res
          .status(201)
          .json({
            data: parseUser(user),
            status: setStatus(req, 0, 'Successful')
          })
      })
      .catch((err: Error) => {
        if (err.message.includes('duplicate key')) {
          return res
            .status(409)
            .json({ status: setStatus(req, 409, 'Conflict') })
        }
        return res
          .status(500)
          .json({ status: setStatus(req, 500, 'Internal Server Error') })
      })
  })
}

export const signIn = (req: Request, res: Response): void => {
  const { username = undefined, email = undefined } = req.body
  const filter = username ? { username } : { email }
  UserModel.findOne(filter)
    .then((user) => {
      if (!user) {
        return res
          .status(404)
          .json({ status: setStatus(req, 404, 'Not Found') })
      }

      const { _id: id, username, password, salt } = user

      return pbkdf2(
        req.body.password,
        salt, 310000, 64, 'sha512',
        (err, derivedKey): Response => {
          if (err != null || !timingSafeEqual(password, derivedKey)) {
            return res
              .status(401)
              .json({ status: setStatus(req, 401, 'Unauthorized') })
          }

          const token = jwt.sign(
            { id, username },
            String(process.env.JWT_SECRET),
            { expiresIn: 24 * 60 * 60 * 1000 }
          )

          res.cookie('api-auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: dayjs().add(1, 'day').toDate(),
            domain: process.env.NODE_ENV === 'production' ? '.gracehopper.xyz' : undefined,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
          })

          return res
            .status(200)
            .json({
              data: parseUser(user),
              status: setStatus(req, 0, 'Successful')
            })
        })
    })
    .catch(() => {
      return res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}

export const signOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const authToken = req.cookies['api-auth']
    await invalidateToken(String(req.body.user.username), authToken)
    res
      .clearCookie('api-auth')
      .status(200)
      .json({ status: setStatus(req, 0, 'Successful') })
  } catch (err) {
    res
      .status(500)
      .json({ status: setStatus(req, 500, 'Internal Server Error') })
  }
}

export const verify = (req: Request, res: Response): void => {
  res
    .status(200)
    .json({ status: setStatus(req, 200, 'Successful') })
}

export const forgotPassword = (req: Request, res: Response): void => {
  const { email } = req.body
  UserModel.findOne({ email })
    .then((user: any) => {
      if (!user) {
        return res
          .status(404)
          .json({ status: setStatus(req, 404, 'Not Found') })
      }

      const { _id: id, email } = user.toJSON()
      const secret = String(process.env.JWT_SECRET) + String(user.password.toString('hex'))
      const payload = { id, email }
      const token = jwt.sign(payload, secret, { expiresIn: '15m' })
      const url = `${req.protocol}://${req.get('host') ?? req.hostname}/reset-password/${String(id)}/${token}`

      return res
        .status(200)
        .json({
          data: { id, url },
          status: setStatus(req, 0, 'Successful')
        })
    })
    .catch(_ => {
      return res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}

export const resetPassword = (req: Request, res: Response): void => {
  const { id, token } = req.params

  UserModel.findById(id)
    .then((user: any) => {
      if (!user) {
        return res
          .status(404)
          .json({ status: setStatus(req, 404, 'Not Found') })
      }

      const secret = String(process.env.JWT_SECRET) + String(user.password.toString('hex'))
      const data = jwt.verify(token, secret)

      return res
        .status(200)
        .json({
          data,
          status: setStatus(req, 0, 'Successful')
        })
    })
    .catch(() => {
      return res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}

export const changePassword = (req: Request, res: Response): void => {
  const { id, token } = req.params
  const salt = randomBytes(16)

  UserModel.findById(id)
    .then((user: any) => {
      if (!user) {
        return res
          .status(404)
          .json({ status: setStatus(req, 404, 'Not Found') })
      }

      const secret = String(process.env.JWT_SECRET) + String(user.password.toString('hex'))
      return jwt.verify(token, secret, (err, _decoded) => {
        if (err) {
          return res
            .status(401)
            .json({ status: setStatus(req, 401, 'Unauthorized') })
        }

        return pbkdf2(req.body.password, salt, 310000, 64, 'sha512', (err, derivedKey) => {
          if (err) {
            return res
              .status(500)
              .json({ status: setStatus(req, 500, 'Internal Server Error') })
          }

          return UserModel.findByIdAndUpdate({ _id: id }, {
            password: derivedKey,
            salt
          })
            .then(() => {
              return res
                .status(200)
                .json({ status: setStatus(req, 0, 'Successful') })
            })
            .catch(() => {
              return res
                .status(500)
                .json({ status: setStatus(req, 500, 'Internal Server Error') })
            })
        })
      })
    })
    .catch((_err: Error) => {
      return res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}
