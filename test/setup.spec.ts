import { UserModel } from '@models/user'

beforeEach((done) => {
  UserModel.deleteMany({})
    .catch((err) => console.log(err))
  done()
})

afterEach((done) => {
  UserModel.deleteMany({})
    .catch((err) => console.log(err))
  done()
})
