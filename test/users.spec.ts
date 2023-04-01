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

describe('GET /v1/users', () => {
  it('should return a successful response with correct meta, data and status', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-in').send(client)
      .then(async res => {
        await request(app).get('/v1/users')
          .set('Cookie', res.headers['set-cookie'])
          .expect(200)
          .then(res => {
            chai.expect(res.body).to.have.property('meta')
            chai.expect(res.body).to.have.property('data')
            chai.expect(res.body).to.have.property('status')
          })
      })
  })
})

describe('GET /v1/users/:id', () => {
  it('should return a successful response with correct data and status', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-in').send(client)
      .then(async res => {
        await request(app).get(`/v1/users/${String(res.body.data.id)}`)
          .set('Cookie', res.headers['set-cookie'])
          .expect(200)
          .then(res => {
            chai.expect(res.body).to.have.property('data')
            chai.expect(res.body).to.have.property('status')
          })
      })
  })

  it('user could not be found', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-in').send(client)
      .then(async res => {
        await request(app).get('/v1/users/642735a8e91e6eeaa1ef9499')
          .set('Cookie', res.headers['set-cookie'])
          .expect(404)
          .then(res => {
            chai.expect(res.body).to.have.property('status')
          })
      })
  })
})

describe('PATCH /v1/users/:id', () => {
  it('should update the user and return a successful response with correct data and status', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-in').send(client)
      .then(async res => {
        await request(app)
          .patch(`/v1/users/${String(res.body.data.id)}`)
          .set('Cookie', res.headers['set-cookie'])
          .send({ username: 'janedoe' })
          .expect(200)
          .then(res => {
            chai.expect(res.body).to.have.property('data')
            chai.expect(res.body).to.have.property('status')
            chai.expect(res.body.data.username).to.be.equal('janedoe')
          })
      })
  })

  it('should return a Not Found response if the user is not found', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-in').send(client)
      .then(async res => {
        await request(app)
          .patch('/v1/users/642735a8e91e6eeaa1ef9499')
          .set('Cookie', res.headers['set-cookie'])
          .send({ username: 'janedoe' })
          .expect(404)
          .then(res => {
            chai.expect(res.body).to.have.property('status')
          })
      })
  })
})

describe('DELETE /v1/users/:id', () => {
  it('should delete the user and return a successful response with correct status', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-in').send(client)
      .then(async res => {
        const { id } = res.body.data
        await request(app)
          .delete(`/v1/users/${String(id)}`)
          .set('Cookie', res.headers['set-cookie'])
          .expect(200)
          .then(res => {
            chai.expect(res.body).to.have.property('status')
          })
      })
  })

  it('should return a Not Found response if the user is not found', async () => {
    await request(app).post('/v1/auth/sign-up').send(newClient)
    await request(app).post('/v1/auth/sign-in').send(client)
      .then(async res => {
        await request(app)
          .delete('/v1/users/642735a8e91e6eeaa1ef9499')
          .set('Cookie', res.headers['set-cookie'])
          .expect(404)
          .then(res => {
            chai.expect(res.body).to.have.property('status')
          })
      })
  })
})
