import { Request, Response } from 'express'
import { setStatus } from '@lib/status'
import { UserModel } from '@models/user'

export const getAll = (req: Request, res: Response): void => {
  res
    .status(200)
    .json({
      ...res.locals,
      status: setStatus(req, 0, 'OK')
    })
}

export const getOne = (req: Request, res: Response): void => {
  UserModel.findById(req.params.id)
    .then((user) => {
      if (!user) {
        return res
          .status(404)
          .json(setStatus(req, 404, 'Not Found'))
      }

      return res
        .status(200)
        .json({
          data: user,
          status: setStatus(req, 0, 'OK')
        })
    })
    .catch(_err => {
      return res
        .status(500)
        .json(setStatus(req, 500, 'Internal Server Error'))
    })
}

export const updateOne = (req: Request, res: Response): void => {
  UserModel.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then((user) => {
      res
        .status(200)
        .json({
          data: user,
          status: setStatus(req, 0, 'OK')
        })
    })
    .catch(_err => {
      res
        .status(500)
        .json(setStatus(req, 500, 'Internal Server Error'))
    })
}

export const deleteOne = (req: Request, res: Response): void => {
  UserModel.findByIdAndDelete(req.params.id, req.body)
    .then(_ => {
      res
        .status(200)
        .json({
          status: setStatus(req, 0, 'OK')
        })
    })
    .catch(_err => {
      res
        .status(500)
        .json(setStatus(req, 500, 'Internal Server Error'))
    })
}
