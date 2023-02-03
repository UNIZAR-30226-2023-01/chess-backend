import * as chai from 'chai'
import request from 'supertest'
import app from '../app'

const client = {
  username: 'Jonh Doe',
  password: 'qwerty123'
}

describe('GET /api/v1/ping', () => {
  it('El servidor hace pong', async () => {
    const response = await request(app)
      .get('/api/v1/ping')
      .expect('Content-Type', /json/)
      .expect(200)

    chai.expect(response).to.be.an('object')
    chai.expect(response).to.have.property('status')
    chai.expect(response.body.status).to.be.an('object')
    chai.expect(response.body.status).to.have.property('timestamp')
    chai.expect(response.body.status).to.have.property('error_code')
    chai.expect(response.body.status).to.have.property('error_message')
    chai.expect(response.body.status).to.have.property('elapsed')
    chai.expect(response.body.status.error_message).to.be.equal('pong')
  })
})

describe('GET /api/v1/ping-v2', () => {
  it('El servidor hace pong', async () => {
    await request(app)
      .post('/api/v1/sign-up')
      .send(client)
      .expect(201)
      .then(async _ => {
        await request(app)
          .post('/api/v1/sign-in')
          .send(client)
          .expect(200)
          .then(async res => {
            const response = await request(app)
              .get('/api/v1/ping-v2')
              .set('Cookie', res.headers['set-cookie'])
              .expect('Content-Type', /json/)
              .expect(200)

            chai.expect(response).to.be.an('object')
            chai.expect(response).to.have.property('status')
            chai.expect(response.body.status).to.be.an('object')
            chai.expect(response.body.status).to.have.property('timestamp')
            chai.expect(response.body.status).to.have.property('error_code')
            chai.expect(response.body.status).to.have.property('error_message')
            chai.expect(response.body.status).to.have.property('elapsed')
            chai.expect(response.body.status.error_message).to.be.equal('pong (protected)')
          })
      })
  })

  it('El usuario no tiene permiso', async () => {
    await request(app)
      .get('/api/v1/ping-v2')
      .expect(401)
  })
})
