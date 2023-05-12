import * as fake from './fake-data'

console.log('NODE_ENV:', process.env.NODE_ENV, '\n')

before((done) => {
  fake.clearClientWithCallback(async () => {
    await fake.setGame()
    done()
  })
})

afterEach((done) => {
  fake.clearClientWithCallback(async () => {
    done()
  })
})

after((done) => {
  fake.clearClientWithCallback(async () => {
    await fake.clearGame()
    done()
  })
})
