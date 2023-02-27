import { Request, Response, NextFunction } from 'express'
import { setStatus } from '../../lib/status'
import UserModel from '../models/user'
import passport from 'passport'
import { client } from '../../config/database'

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
    passport.authenticate('jwt', { session: false }, (_err: Error, user: boolean, _info: any): any => {
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated!' })
      }
      const blacklist = 'token-blacklist'
      const token = req.cookies['api-auth']

      void client.get(blacklist).then((redisUser: any) => {
        let parsedUserData = JSON.parse(redisUser)
        if (redisUser !== null) {
          parsedUserData = parsedUserData[blacklist]
        }

        if (parsedUserData?.includes(token)) {
          res.clearCookie('api-auth')
          return res.status(401).json({ message: 'Invalid Token!' })
        } else {
          return next()
        }
      })
    })(req, res, next)
  } catch (err) {
    console.log('Error: ', err)
    return next(err)
  }
}
