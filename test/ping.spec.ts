import * as chai from 'chai'
import request from 'supertest'
import app from '@app'

const newClient = {
  username: 'johndoe',
  email: 'johndoe@example.com',
  password: 'qwerty123'
}

const client = {
  username: 'johndoe',
  password: 'qwerty123'
}

describe('GET /v1/health/ping', () => {
  it('El servidor hace pong', async () => {
    const response = await request(app)
      .get('/v1/health/ping')
      .expect('Content-Type', /json/)
      .expect(200)

    chai.expect(response).to.be.an('object')
    chai.expect(response).to.have.property('status')
  })
})

describe('GET /v1/health/secure-ping', () => {
  it('El servidor hace pong', async () => {
    await request(app)
      .post('/v1/auth/sign-up')
      .send(newClient)
      .expect(201)
      .then(async _ => {
        await request(app)
          .post('/v1/auth/sign-in')
          .send(client)
          .expect(200)
          .then(async res => {
            const response = await request(app)
              .get('/v1/health/secure-ping')
              .set('Cookie', res.headers['set-cookie'])
              .expect('Content-Type', /json/)
              .expect(200)

            chai.expect(response).to.be.an('object')
            chai.expect(response).to.have.property('status')
          })
      })
  })

  it('El usuario no tiene permiso', async () => {
    await request(app)
      .get('/v1/health/secure-ping')
      .expect(401)
  })
})
