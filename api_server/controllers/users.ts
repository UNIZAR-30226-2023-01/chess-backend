import { Request, Response } from 'express'
import { setStatus } from '@lib/status'
import { UserModel } from '@models/user'
import { parseExtendedUser } from '@lib/parsers'

export const getAll = async (req: Request, res: Response): Promise<void> => {
  const { meta, data } = res.locals

  res
    .status(200)
    .json({
      meta,
      data: await Promise.all(data.map(parseExtendedUser)),
      status: setStatus(req, 0, 'Successful')
    })
}

export const getOne = (req: Request, res: Response): void => {
  UserModel.findById(req.params.id)
    .then(async (user) => {
      if (!user) {
        return res
          .status(404)
          .json({ status: setStatus(req, 404, 'Not Found') })
      }

      return res
        .status(200)
        .json({
          data: await parseExtendedUser(user),
          status: setStatus(req, 0, 'Successful')
        })
    })
    .catch(_err => {
      return res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}

export const updateOne = (req: Request, res: Response): void => {
  UserModel.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then(async (user) => {
      if (!user) {
        return res
          .status(404)
          .json({ status: setStatus(req, 404, 'Not Found') })
      }

      return res
        .status(200)
        .json({
          data: await parseExtendedUser(user),
          status: setStatus(req, 0, 'Successful')
        })
    })
    .catch(_err => {
      return res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}

export const deleteOne = (req: Request, res: Response): void => {
  UserModel.findByIdAndDelete(req.params.id, req.body)
    .then(user => {
      if (!user) {
        return res
          .status(404)
          .json({ status: setStatus(req, 404, 'Not Found') })
      }

      return res
        .status(200)
        .json({
          status: setStatus(req, 0, 'Successful')
        })
    })
    .catch(err => {
      console.log(err)
      res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}
