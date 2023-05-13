import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { UserModel } from '@models/user'

const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/v1/auth/google/callback'

passport.use(new GoogleStrategy({
  clientID: String(process.env.GOOGLE_CLIENT_ID),
  clientSecret: String(process.env.GOOGLE_CLIENT_SECRET),
  callbackURL: GOOGLE_CALLBACK_URL,
  passReqToCallback: true
},

async (_req: any, _accessToken: any, _refreshToken: any, profile: any, done: any) => {
  const update = {
    $setOnInsert: {
      username: profile.displayName,
      email: profile.emails[0].value
    },
    $set: {
      googleId: profile.id,
      verified: true
    }
  }

  // eslint-disable-next-line @typescript-eslint/return-await
  return await UserModel.findOneAndUpdate(
    { email: profile.emails[0].value },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  )
    .then((user) => {
      return done(null, { id: user.id, username: user.username })
    })
    .catch((err) => {
      return done(err, null)
    })
}
))
