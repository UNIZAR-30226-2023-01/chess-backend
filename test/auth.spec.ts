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

describe('POST /v1/auth/sign-up', () => {
  it('Successful', async () => {
    await request(app)
      .post('/v1/auth/sign-up')
      .send(newClient)
      .expect(201)
      .then(res => {
        chai.expect(res.body).to.have.property('data')
        chai.expect(res.body).to.have.property('status')
      })
  })

  it('Bad Request', async () => {
    await request(app)
      .post('/v1/auth/sign-up')
      .send({ username: 'test', email: 'test@example.com', password: '' })
      .expect(400)
      .then(res => {
        chai.expect(res.body).to.have.property('status')
      })
  })

  it('Conflict', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-up').send(newClient)
      .expect(409)
      .then(res => {
        chai.expect(res.body).to.have.property('status')
      })
  })
})

describe('POST /v1/auth/sign-in', () => {
  it('should return 404 if user not found', async () => {
    await request(app)
      .post('/v1/auth/sign-in')
      .send({ username: 'notARealUser', password: 'fakePassword' })
      .expect(404)
      .then(res => {
        chai.expect(res.body).to.have.property('status')
      })
  })

  it('should return 401 if password is incorrect', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app)
      .post('/v1/auth/sign-in')
      .send({ email: newClient.email, password: 'wrongPassword' })
      .expect(401)
      .then(res => {
        chai.expect(res.body).to.have.property('status')
      })
  })

  it('should return 200 and a token if login is successful', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app)
      .post('/v1/auth/sign-in')
      .send({ username: newClient.username, password: newClient.password })
      .expect(200)
      .then(res => {
        chai.expect(res.body).to.have.property('data')
        chai.expect(res.body).to.have.property('status')
        chai.expect(res).to.have.cookie('api-auth')
      })
  })
})

describe('POST /v1/auth/sign-out', () => {
  it('should invalidate token and clear api-auth cookie', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-in').send(client)
      .then(async res => {
        await request(app)
          .post('/v1/auth/sign-out')
          .set('Cookie', res.headers['set-cookie'])
          .expect(200)
          .expect(res => {
            chai.expect(res).to.have.not.cookie('api-auth')
          })
      })
  })

  it('should return 401 if an error occurs', async () => {
    await request(app)
      .post('/v1/auth/sign-out')
      .set('Cookie', 'api-auth=invalid-auth-token')
      .send()
      .expect(401)
      .expect(res => {
        chai.expect(res.body).to.have.property('status')
      })
  })
})

describe('POST /v1/auth/forgot-password', () => {
  it('should return 200 and the reset password URL', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app)
      .post('/v1/auth/forgot-password')
      .send({ email: client.email })
      .expect(200)
      .expect(res => {
        chai.expect(res.body).to.have.property('status')
      })
  })

  it('should return 404 if user is not found', async () => {
    await request(app)
      .post('/v1/auth/forgot-password')
      .send({ email: 'non-existent-email@example.com' })
      .expect(404)
      .expect(res => {
        chai.expect(res.body).to.have.property('status')
      })
  })
})

describe('POST /v1/auth/reset-password', () => {
  it('should return a success message with a valid token', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/forgot-password').send({ email: newClient.email })
      .then(async res => {
        const data = res.body.data
        const url = data.url
        const lastIndex = url.lastIndexOf('/')
        const token = url.substring(Number(lastIndex) + 1)

        console.log('id', data.id)
        console.log('token', token)

        await request(app)
          .get(`/v1/auth/reset-password/${String(data.id)}/${String(token)}`)
          .expect(200)
          .then(res => {
            chai.expect(res.body).to.have.property('data')
            chai.expect(res.body).to.have.property('status')
          })
      })
  })

  it('should return a not found error with an invalid user id', async () => {
    await request(app)
      .get('/v1/auth/reset-password/642735a8e91e6eeaa1ef9499/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0MjZjN2EyZjliODA3OTMwMGVhODFiNiIsImVtYWlsIjoiam9obmRvZUBleGFtcGxlLmNvbSIsImlhdCI6MTY4MDI2NDIxMCwiZXhwIjoxNjgwMjY1MTEwfQ.tNDQashVUqkQ_C4060JVWc8bi75qfUd0eLHCdXlHn6I')
      .expect(404)
  })
})
