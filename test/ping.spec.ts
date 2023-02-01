import assert from 'assert'
import * as chai from 'chai'
import request from 'supertest'
import app from '../app'

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
    assert.equal(response.body.status.error_message, 'pong')
  })
})

describe('GET /api/v1/ping-v2', () => {
  it('El servidor hace pong', async () => { })
  it('El usuario no tiene permiso', async () => { })
})
