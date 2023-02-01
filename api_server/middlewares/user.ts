import { Request, Response, NextFunction } from 'express'
import UserModel from '../models/user'

export const userBlockExists = (req: Request, res: Response, next: NextFunction): void => {
  UserModel.doesUserExist(req.body.username)
    .then((userExists: Boolean) => {
      if (userExists === true) res.status(409).send('User already exists.')
      else next()
    }).catch((error: any) => {
      console.error(error)
      res.status(500).send('Internal server error.')
    })
}

export const userPassExists = (req: Request, res: Response, next: NextFunction): void => {
  UserModel.doesUserExist(req.body.username)
    .then((userExists: Boolean) => {
      if (userExists === true) next()
      else res.status(409).send('User does not exist exists.')
    }).catch((error: any) => {
      console.error(error)
      res.status(500).send('Internal server error.')
    })
}
