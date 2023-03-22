import { Request, Response, NextFunction } from 'express'
import passport from 'passport'
import { TokenValidationResult, validateToken } from '@lib/token-blacklist'

export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) return next()
  try {
    passport.authenticate('jwt', { session: false },
      async (_err: Error, user: any, _info: any): Promise<void> => {
        if (!user) {
          res
            .status(401)
            .json({ message: 'User not authenticated!' })
          return
        }

        const status = await validateToken(
          String(user.username),
          req.cookies['api-auth']
        )

        if (status === TokenValidationResult.ERROR) {
          res
            .status(500)
            .json({ message: 'Internal server error' })
        } else if (status === TokenValidationResult.INVALID_TOKEN) {
          res.clearCookie('api-auth')
          res
            .status(401)
            .json({ message: 'Invalid Token!' })
        } else {
          req.body.user = user
          next()
        }
      })(req, res, next)
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Internal server error' })
  }
}
