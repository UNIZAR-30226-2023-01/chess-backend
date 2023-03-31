import { object, string } from 'yup'

export const updateUser = object().shape({
  avatar: string(),
  username: string(),
  email: string().email(),
  skins: string().email()
}).test('at least one field required', 'You must provide at least one field to update', function (values) {
  const { avatar, username, email, skins } = values
  if (!avatar && !username && !email && !skins) {
    return this.createError({
      message: 'You must provide at least one field to update',
      path: ''
    })
  }
  return true
})
