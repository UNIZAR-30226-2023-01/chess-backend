import { Request, Response, NextFunction } from 'express'
import { setStatus } from '../../lib/status'
import UserModel from '../models/user'

export const userBlockExists = (req: Request, res: Response, next: NextFunction): void => {
  UserModel.doesUserExist(req.body.username)
    .then((userExists: Boolean) => {
      if (userExists !== true) return next()
      return res
        .status(409)
        .json(setStatus(req, 409, 'User already exists'))
    }).catch(_ => {
      return res
        .status(500)
        .json(setStatus(req, 500, 'Internal server error'))
    })
}

export const userPassExists = (req: Request, res: Response, next: NextFunction): void => {
  UserModel.doesUserExist(req.body.username)
    .then((userExists: Boolean) => {
      if (userExists === true) return next()
      return res
        .status(409)
        .json(setStatus(req, 409, 'User does not exist'))
    }).catch(_ => {
      return res
        .status(500)
        .json(setStatus(req, 500, 'Internal server error'))
    })
}
