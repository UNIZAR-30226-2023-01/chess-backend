import { Request, Response, NextFunction } from 'express'
import { setStatus } from '../../lib/status'
import UserModel from '../models/user'
import passport from 'passport'
import { client, redlock } from '../../config/database'

export const userExists = (req: Request, res: Response, next: NextFunction): void => {
  UserModel.doesUserExist(req.body.username, req.body.email)
    .then((flag: Boolean) => {
      if (flag === false) return next()
      return res
        .status(409)
        .json(setStatus(req, 409, 'User already exists'))
    }).catch(_ => {
      return res
        .status(500)
        .json(setStatus(req, 500, 'Internal server error'))
    })
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) return next()
  try {
    passport.authenticate('jwt', { session: false },
      async (_err: Error, user: boolean, _info: any): Promise<void> => {
        if (!user) {
          res
            .status(401)
            .json({ message: 'User not authenticated!' })
          return
        }
        const blacklist = 'token-blacklist'
        const token = req.cookies['api-auth']

        let record: string | null = null
        const lock = await redlock.acquire([blacklist + '-lock'], 5000) // LOCK
        try {
          record = await client.get(blacklist)
        } catch (err) {
          res
            .status(500)
            .json({ message: 'Internal server error' })
        } finally {
          await lock.release() // UNLOCK
        }
        let parsedUserData
        if (record !== null) {
          parsedUserData = JSON.parse(record)[blacklist]
        }

        if (parsedUserData?.includes(token)) {
          res.clearCookie('api-auth')
          res
            .status(401)
            .json({ message: 'Invalid Token!' })
        } else {
          next()
        }
      })(req, res, next)
  } catch (err) {
    console.log('Error: ', err)
    next(err)
  }
}
