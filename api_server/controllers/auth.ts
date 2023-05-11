import { Request, Response } from 'express'
import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import dayjs from 'dayjs'
import jwt from 'jsonwebtoken'
import { ReservedUsernames, UserModel } from '@models/user'
import { setStatus } from '@lib/status'
import { invalidateToken } from '@lib/token-blacklist'
import { parseUser } from '@lib/parsers'
import sgMail from '@sendgrid/mail'
import * as achievement from '@lib/achievements'
import * as dotenv from 'dotenv'
import * as logger from '@lib/logger'
dotenv.config()

const URI = process.env.NODE_ENV === 'production' ? 'https://reign.gracehopper.xyz' : 'http://localhost:3000'

export const signUp = (req: Request, res: Response): void => {
  // Check if the username is reserved
  if (process.env.NODE_ENV !== 'test' &&
      Object.values(ReservedUsernames).includes(req.body.username)) {
    res.status(409).json({ status: setStatus(req, 409, 'Conflict') })
    return
  }

  const salt = randomBytes(16)
  pbkdf2(req.body.password, salt, 310000, 64, 'sha512', async (err, derivedKey) => {
    if (err) {
      logger.error(String(err))
      return res.status(409).json({ status: setStatus(req, 409, 'Conflict') })
    }

    return await UserModel.create({
      username: req.body.username,
      email: req.body.email,
      password: derivedKey,
      salt
    })
      .then(async (user) => {
        const { _id: id, email } = user.toJSON()
        const secret = String(process.env.JWT_SECRET) + String(user.password.toString('hex'))
        const payload = { id, email }
        const token = jwt.sign(payload, secret, { expiresIn: '15m' })
        const url = `${URI}/auth/verify/${String(id)}/${token}`

        const msg = {
          to: email,
          from: 'hi@gracehopper.xyz',
          templateId: 'd-2b5bee891e744e05a027478bd276ccee',
          dynamicTemplateData: {
            subject: 'Verifica tu cuenta de Reign',
            url
          }
        }

        // NO EMAIL CHECKING IN TEST MODE
        if (process.env.NODE_ENV === 'test') {
          UserModel.findByIdAndUpdate(id, { verified: true }).then(_ => {}).catch(_ => {})
          res.status(201).json({
            data: await parseUser(user),
            status: setStatus(req, 0, 'Successful')
          })
          return
        }

        sgMail.setApiKey(String(process.env.SENDGRID_API_KEY))
        sgMail.send(msg)
          .then(async () => {
            return res
              .status(201)
              .json({
                data: await parseUser(user),
                status: setStatus(req, 0, 'Successful')
              })
          })
          .catch(() => {
            return res
              .status(500)
              .json({ status: setStatus(req, 500, 'Internal Server Error') })
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
    .then(async (user) => {
      if (!user) {
        return res
          .status(404)
          .json({ status: setStatus(req, 404, 'Not Found') })
      }

      const { _id: id, username, password, salt, verified } = user

      if (!verified) {
        return res
          .status(403)
          .json({ status: setStatus(req, 403, 'Forbidden') })
      }

      return pbkdf2(
        req.body.password,
        salt, 310000, 64, 'sha512',
        async (err, derivedKey): Promise<Response> => {
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

          achievement.setFirstLoginAchievement(user.id).then(_ => {}).catch(_ => {})

          return res
            .status(200)
            .json({
              data: await parseUser(user),
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
      .clearCookie('api-auth', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: dayjs().add(1, 'day').toDate(),
        domain: process.env.NODE_ENV === 'production' ? '.gracehopper.xyz' : undefined,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
      })
      .status(200)
      .json({ status: setStatus(req, 0, 'Successful') })
  } catch (err) {
    res
      .status(500)
      .json({ status: setStatus(req, 500, 'Internal Server Error') })
  }
}

export const authenticate = (req: Request, res: Response): void => {
  res
    .status(200)
    .json({ status: setStatus(req, 200, 'Successful') })
}

export const verify = (req: Request, res: Response): void => {
  const { id, token } = req.params
  UserModel.findByIdAndUpdate(id, { verified: true })
    .then((user) => {
      if (!user) {
        return res
          .status(404)
          .json({ status: setStatus(req, 404, 'Not Found') })
      }

      const secret = String(process.env.JWT_SECRET) + String(user.password.toString('hex'))
      jwt.verify(token, secret)

      return res
        .status(200)
        .json({ status: setStatus(req, 200, 'Successful') })
    })
    .catch(() => {
      res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}

export const forgotPassword = (req: Request, res: Response): void => {
  const { email } = req.body
  UserModel.findOne({ email })
    .then(async (user: any) => {
      if (!user) {
        return res
          .status(404)
          .json({ status: setStatus(req, 404, 'Not Found') })
      }

      const { _id: id, email } = user.toJSON()
      const secret = String(process.env.JWT_SECRET) + String(user.password.toString('hex'))
      const payload = { id, email }
      const token = jwt.sign(payload, secret, { expiresIn: '15m' })
      const url = `${URI}/auth/reset-password/${String(id)}/${token}`
      const data = { id, url }

      const msg = {
        to: email,
        from: 'hi@gracehopper.xyz',
        templateId: 'd-dc0aeb5b912d49aa94527a96cade5e71',
        dynamicTemplateData: {
          subject: 'Ha solicitado un restablecimiento de contraseña',
          url
        }
      }

      // NO EMAIL CHECKING IN TEST MODE
      if (process.env.NODE_ENV === 'test') {
        await UserModel.findByIdAndUpdate(id, { verified: true })
        res.status(200).json({
          data,
          status: setStatus(req, 0, 'Successful')
        })
        return
      }

      sgMail.setApiKey(String(process.env.SENDGRID_API_KEY))
      return await sgMail.send(msg)
        .then(() => {
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
            .json({
              data,
              status: setStatus(req, 500, 'Internal Server Error')
            })
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

        return pbkdf2(req.body.password, salt, 310000, 64, 'sha512', async (err, derivedKey) => {
          if (err) {
            return res
              .status(500)
              .json({ status: setStatus(req, 500, 'Internal Server Error') })
          }

          return await UserModel.findByIdAndUpdate({ _id: id }, {
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

export const googleCallback = (req: Request, res: Response): void => {
  const { id, username } = req.user as any

  const token = jwt.sign(
    { id, username },
    String(process.env.JWT_SECRET),
    { expiresIn: 24 * 60 * 60 * 1000 }
  )

  res
    .cookie('api-auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: dayjs().add(1, 'day').toDate(),
      domain: process.env.NODE_ENV === 'production' ? '.gracehopper.xyz' : undefined,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    })
    .redirect(String(process.env.SUCCESS_REDIRECT))
}
