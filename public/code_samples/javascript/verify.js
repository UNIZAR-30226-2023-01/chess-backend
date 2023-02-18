const raw = ''

const requestOptions = {
  method: 'POST',
  body: raw,
  redirect: 'follow'
}

fetch('http://localhost:4000/api/v1/auth/verify', requestOptions)
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error))
