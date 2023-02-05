import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import UserModel from '../api_server/models/user'

const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3000/api/v1/auth/google/callback'

passport.use(new GoogleStrategy({
  clientID: String(process.env.GOOGLE_CLIENT_ID),
  clientSecret: String(process.env.GOOGLE_CLIENT_SECRET),
  callbackURL: GOOGLE_CALLBACK_URL,
  passReqToCallback: true
},
// eslint-disable-next-line @typescript-eslint/no-misused-promises
async (_req: any, _accessToken: any, _refreshToken: any, profile: any, done: any) => {
  const defaultUser = {
    googleId: profile.id,
    username: profile.displayName,
    email: profile.emails[0].value,
    avatar: profile.photos[0].value
  }

  return await UserModel.findOneAndUpdate(
    { googleId: profile.id },
    defaultUser,
    { upsert: true, new: true }
  )
    .then((user) => {
      console.log('user', user.toJSON())
      return done(null, { id: user.id, email: user.email })
    })
    .catch((err) => {
      console.error('Error signing up ', err)
      return done(err, null)
    })
}
))

passport.serializeUser((user: any, done: any) => {
  process.nextTick(() => {
    done(null, { id: user.id, username: user.username })
  })
})

passport.deserializeUser((id: any, done: any) => {
  process.nextTick(async () => {
    const user = await UserModel.findOne({ googleId: id })
      .catch((err) => {
        console.error('Error deserializing user ', err)
        return done(err, null)
      })

    if (user !== null) return done(null, user)
  })
})
