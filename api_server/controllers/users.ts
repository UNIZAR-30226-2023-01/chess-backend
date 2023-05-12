import { Request, Response } from 'express'
import { setStatus } from '@lib/status'
import { UserDocument, UserModel } from '@models/user'
import { parseExtendedUser } from '@lib/parsers'
import * as logger from '@lib/logger'

export const getAll = async (req: Request, res: Response): Promise<void> => {
  let { meta, data } = res.locals

  data = await Promise.all(data.map(parseExtendedUser))

  res
    .status(200)
    .json({
      meta,
      data: data.filter((u: UserDocument) => { return !u.removed }),
      status: setStatus(req, 0, 'Successful')
    })
}

export const getOne = (req: Request, res: Response): void => {
  UserModel.findById(req.params.id)
    .then(async (user) => {
      if (!user || user.removed) {
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
  UserModel.findOneAndUpdate({ _id: req.params.id, removed: false }, req.body, { new: true })
    .then(async (user) => {
      if (!user || user.removed) {
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
  UserModel.findByIdAndUpdate(req.params.id, { $set: { removed: true } })
    .then(user => {
      if (!user || user.removed) {
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
      logger.error(String(err))
      res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}
