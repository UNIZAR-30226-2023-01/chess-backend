import { Request, Response, NextFunction } from 'express'

export const stamp = (req: Request, _res: Response, next: NextFunction): void => {
  req.headers['X-Request-Time'] = performance.now().toString()
  next()
}
