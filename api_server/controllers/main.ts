import { Request, Response } from 'express'

export const pong = (req: Request, res: Response): void => {
  res
    .status(200)
    .json({
      status: {
        timestamp: new Date().toISOString(),
        error_code: 0,
        error_message: 'pong',
        elapsed: Math.floor(performance.now() - Number(req.headers['X-Request-Time']))
      }
    })
}

export const protectedPong = (req: Request, res: Response): void => {
  res
    .status(200)
    .json({
      timestamp: new Date().toISOString(),
      error_code: 0,
      error_message: 'pong (protected)',
      elapsed: Math.floor(performance.now() - Number(req.headers['X-Request-Time']))
    })
}
