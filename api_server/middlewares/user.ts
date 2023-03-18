import { Request, Response, NextFunction } from 'express'
import { setStatus } from '@lib/status'
import UserModel from '@models/user'
import passport from 'passport'
import { validateToken } from '@lib/token_blacklist'

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
      async (_err: Error, user: any, _info: any): Promise<void> => {
        if (!user) {
          res
            .status(401)
            .json({ message: 'User not authenticated!' })
          return
        }

        const status = await validateToken(
          String(user.username),
          req.cookies['api-auth']
        )

        if (status === 500) {
          res
            .status(500)
            .json({ message: 'Internal server error' })
        } else if (status === 401) {
          res.clearCookie('api-auth')
          res
            .status(401)
            .json({ message: 'Invalid Token!' })
        } else {
          req.body.user = user
          next()
        }
      })(req, res, next)
  } catch (err) {
    console.log('Error: ', err)
    res
      .status(500)
      .json({ message: 'Internal server error' })
  }
}
