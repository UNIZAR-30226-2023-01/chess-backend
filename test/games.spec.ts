import * as chai from 'chai'
import chaiHttp from 'chai-http'
import request from 'supertest'
import app from '@app'

chai.use(chaiHttp)

const newClient = {
  username: 'johndoe',
  email: 'johndoe@example.com',
  password: 'qwerty123'
}

const client = {
  email: 'johndoe@example.com',
  password: 'qwerty123'
}

describe('GET /v1/games', () => {
  it('should return a list of games', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-in').send(client)
      .then(async res => {
        await request(app)
          .get('/v1/games')
          .set('Cookie', res.headers['set-cookie'])
          .expect(200)
          .then((res) => {
            chai.expect(res.body).to.have.property('meta')
            chai.expect(res.body).to.have.property('data')
            chai.expect(res.body).to.have.property('status')
          })
      })
  })
})

describe('GET /v1/games/:id', () => {
  it('should return a game by id', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-in').send(client)
      .then(async res => {
        await request(app).get('/v1/games/6420651a3e7d2cb2c19aa809')
          .set('Cookie', res.headers['set-cookie'])
          .expect(200)
          .then((res) => {
            chai.expect(res.body).to.have.property('data')
            chai.expect(res.body).to.have.property('status')
          })
      })
  })

  it('should return a 404 if game is not found', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-in').send(client)
      .then(async res => {
        await request(app).get('/v1/games/642735a8e91e6eeaa1ef9499')
          .set('Cookie', res.headers['set-cookie'])
          .expect(404)
          .then((res) => {
            chai.expect(res.body).to.have.property('status')
          })
      })
  })
})
