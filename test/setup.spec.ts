import { UserModel } from '@models/user'

beforeEach((done) => {
  UserModel.deleteMany({})
    .then(_ => { done() })
    .catch(err => {
      console.error(err.message)
      done()
    })
})

afterEach((done) => {
  UserModel.deleteMany({})
    .then(_ => { done() })
    .catch(err => {
      console.error(err.message)
      done()
    })
})
