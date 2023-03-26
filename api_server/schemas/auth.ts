import { object, string } from 'yup'

export const signUp = object({
  username: string().required(),
  email: string().email().required(),
  password: string().required().min(8)
})

export const signIn = object().shape({
  username: string(),
  email: string().email(),
  password: string().required()
}).test('oneOfFields', 'Only one of the "username" or "email" fields must be provided, but not both.', function (value) {
  const { username, email } = value
  if ((username && email) ?? (!username && !email)) {
    return this.createError({
      message: 'Only one of the \'username\' or \'email\' fields must be provided, but not both.',
      path: 'username'
    })
  }
  return true
})

export const forgotPassword = object({
  email: string().email().required()
})

export const resetPassword = object({
  password: string().required().min(8)
})
