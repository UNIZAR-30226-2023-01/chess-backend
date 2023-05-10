import * as chai from 'chai'
import chaiHttp from 'chai-http'
import request from 'supertest'
import app from '@app'
import * as fake from './fake-data'

chai.use(chaiHttp)

describe('GET /v1/games', () => {
  it('should return a list of games', async () => {
    await fake.setClient()
    await request(app).post('/v1/auth/sign-in').send(fake.client)
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
    await fake.setClient()
    await request(app).post('/v1/auth/sign-in').send(fake.client)
      .then(async res => {
        await request(app).get('/v1/games/' + fake.getGameId())
          .set('Cookie', res.headers['set-cookie'])
          .expect(200)
          .then((res) => {
            chai.expect(res.body).to.have.property('data')
            chai.expect(res.body).to.have.property('status')
          })
      })
  })

  it('should return a 404 if game is not found', async () => {
    await fake.setClient()
    await request(app).post('/v1/auth/sign-in').send(fake.client)
      .then(async res => {
        await request(app).get('/v1/games/000000000000000000000000')
          .set('Cookie', res.headers['set-cookie'])
          .expect(404)
          .then((res) => {
            chai.expect(res.body).to.have.property('status')
          })
      })
  })
})
