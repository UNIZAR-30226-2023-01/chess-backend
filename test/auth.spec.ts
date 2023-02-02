import * as chai from 'chai'
import chaiHttp from 'chai-http'
import request from 'supertest'
import app from '../app'

chai.use(chaiHttp)

const client = {
  username: 'Jonh Doe',
  password: 'qwerty123'
}

describe('GET /api/v1/sign-up', () => {
  it('Creates a new user', async () => {
    const response = await request(app)
      .post('/api/v1/sign-up')
      .send(client)
      .expect(201)

    chai.expect(response.body).to.be.an('object')
    chai.expect(response.body).to.have.property('data')
    chai.expect(response.body).to.have.property('status')
    chai.expect(response.body.status.error_message).to.be.equal('User created successfully')
  })

  it('The user already exists', async () => {
    await request(app)
      .post('/api/v1/sign-up')
      .send(client).then(async _ => {
        const response = await request(app)
          .post('/api/v1/sign-up')
          .send(client)
          .expect(409)

        chai.expect(response.body).to.be.an('object')
        chai.expect(response.body).not.to.have.property('data')
        chai.expect(response.body).to.have.property('status')
        chai.expect(response.body.status.error_message).to.be.equal('User already exists')
      })
  })
})

describe('GET /api/v1/sign-in', () => {
  it('The user does not exist', async () => {
    const response = await request(app)
      .post('/api/v1/sign-in')
      .send(client)
      .expect(409)

    chai.expect(response).not.to.have.cookie('api-auth')
    chai.expect(response.body).to.be.an('object')
    chai.expect(response.body).not.to.have.property('data')
    chai.expect(response.body).to.have.property('status')
    chai.expect(response.body.status.error_message).to.be.equal('User does not exist')
  })

  it('User succesfuly logged in', async () => {
    await request(app)
      .post('/api/v1/sign-up')
      .send(client)
      .then(async _ => {
        const response = await request(app)
          .post('/api/v1/sign-in')
          .send(client)
          .expect(200)

        chai.expect(response).to.have.cookie('api-auth')
        chai.expect(response.body).to.be.an('object')
        chai.expect(response.body).to.have.property('data')
        chai.expect(response.body).to.have.property('status')
        chai.expect(response.body.status.error_message).to.be.equal('User logged in successfully')
      })
  })
})

describe('GET /api/v1/sign-out', () => {
  it('User successfully closes session', async () => {
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
            await request(app)
              .post('/api/v1/sign-out')
              .set('Cookie', res.headers['set-cookie'])
              .expect(200)
          })
      })
  })

  it('The user must be previously authenticated', async () => {
    await request(app)
      .post('/api/v1/sign-up')
      .send(client)
      .then(async _ => {
        await request(app)
          .post('/api/v1/sign-out')
          .expect(401)
      })
  })
})
