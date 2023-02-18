const raw = ''

const requestOptions = {
  method: 'POST',
  body: raw,
  redirect: 'follow'
}

fetch('http://localhost:4000/api/v1/auth/sign-out', requestOptions)
  .then(response => response.json())
  .catch(error => console.error('error', error))
