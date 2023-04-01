import { object, string } from 'yup'

export const updateUser = object().shape({
  avatar: string(),
  username: string(),
  email: string().email(),
  board: string(),
  lightPieces: string(),
  darkPieces: string()
}).test('at least one field required', 'You must provide at least one field to update', function (values) {
  const { avatar, username, email, board, lightPieces, darkPieces } = values
  if (!avatar && !username && !email && !board && !lightPieces && !darkPieces) {
    return this.createError({
      message: 'You must provide at least one field to update',
      path: ''
    })
  }
  return true
})
