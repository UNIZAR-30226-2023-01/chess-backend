import { Request } from 'express'
import passport from 'passport'
import { Strategy as JWTStrategy, VerifiedCallback } from 'passport-jwt'
import UserModel from '../api_server/models/user'

const cookieExtractor = (req: Request): string | null => {
  let token = null
  if ((Boolean(req)) && (Boolean(req.cookies))) token = req.cookies['api-auth']
  // if (req && req.signedCookies && req.signedCookies.jwt) {
  //   token = req.signedCookies["jwt"]["token"];
  // }
  return token
}

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: cookieExtractor,
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
      jsonWebTokenOptions: {
        maxAge: '7d'
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (_req: Request, payload: any, done: VerifiedCallback) => {
      return await UserModel.findOne({ username: payload.username })
        .then(async (user) => {
          if (user != null) done(null, user)
          else done(null, false)
        })
        .catch((err) => done(err))
    })
)
