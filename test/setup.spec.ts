import User from '../api_server/models/user'

beforeEach((done) => {
  User.deleteMany({})
    .catch((err) => console.log(err))
  done()
})

afterEach((done) => {
  User.deleteMany({})
    .catch((err) => console.log(err))
  done()
})
