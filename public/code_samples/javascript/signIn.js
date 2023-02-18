const myHeaders = new Headers()
myHeaders.append('Content-Type', 'application/json')

const raw = JSON.stringify({
  username: 'johndoe',
  password: 'qwerty'
})

const requestOptions = {
  method: 'POST',
  headers: myHeaders,
  body: raw,
  redirect: 'follow'
}

fetch('http://localhost:4000/api/v1/auth/sign-in', requestOptions)
  .then(response => response.json())
  .catch(error => console.error('error', error))
