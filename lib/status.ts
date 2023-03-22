import { Request } from 'express'

export const setStatus = (req: Request, errorCode: Number, errorMessage: String): object => {
  return {
    timestamp: new Date().toISOString(),
    error_code: errorCode,
    error_message: errorMessage,
    elapsed: Math.floor(performance.now() - Number(req.headers['X-Request-Time']))
  }
}
