import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { UserModel } from '@models/user'

const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? 'https://localhost:4000/v1/auth/google/callback'

passport.use(new GoogleStrategy({
  clientID: String(process.env.GOOGLE_CLIENT_ID),
  clientSecret: String(process.env.GOOGLE_CLIENT_SECRET),
  callbackURL: GOOGLE_CALLBACK_URL,
  passReqToCallback: true
},

async (_req: any, _accessToken: any, _refreshToken: any, profile: any, done: any) => {
  const defaultUser = {
    googleId: profile.id,
    username: profile.displayName,
    email: profile.emails[0].value,
    avatar: profile.photos[0].value
  }

  // eslint-disable-next-line @typescript-eslint/return-await
  return await UserModel.findOneAndUpdate(
    { email: defaultUser.email },
    defaultUser,
    { upsert: true, new: true }
  )
    .then((user) => {
      return done(null, { id: user.id, email: user.email })
    })
    .catch((err) => {
      return done(err, null)
    })
}
))

passport.serializeUser((user: any, done: any) => {
  process.nextTick(() => {
    done(null, { id: user.id, username: user.username })
  })
})

passport.deserializeUser((data: any, done: any) => {
  const { id } = data
  process.nextTick(async () => {
    const user = await UserModel.findById(id)
      .catch((err) => {
        return done(err, null)
      })

    if (user !== null) return done(null, user)
  })
})
