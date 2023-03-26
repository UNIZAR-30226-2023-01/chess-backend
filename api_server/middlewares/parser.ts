import { Request, Response, NextFunction } from 'express'
import { setStatus } from '@lib/status'

export const validateBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    schema.validate(req.body)
      .then(() => next())
      .catch((err: Error) => res.status(400).json({ status: setStatus(req, 400, err.message) }))
  }
}
