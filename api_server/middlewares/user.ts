import { Request, Response, NextFunction } from 'express'
import { setStatus } from '../../lib/status'
import UserModel from '../models/user'
import passport from 'passport'

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
  passport.authenticate('jwt', { session: false })(req, res, next)
}
