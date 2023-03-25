<style>
.nested {
  margin-left: 20px;
}
</style>

# express-template  [![Production CI](https://github.com/UNIZAR-30226-01/chess-backend/actions/workflows/production.yml/badge.svg)](https://github.com/UNIZAR-30226-01/chess-backend/actions/workflows/production.yml)

![Beta](https://img.shields.io/badge/Status-Beta-red)
![node](https://img.shields.io/badge/node-16.x-blue)
![npm](https://img.shields.io/badge/npm-8.15.0-blue)

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Mocha](https://img.shields.io/badge/-mocha-%238D6748?style=for-the-badge&logo=mocha&logoColor=white)

## Folder structure

- `app.ts`: This is the main file of your project, it could be the entry point of your application and where you will set up your server.
- `config`: This directory contains any configuration files, such as database connection settings, that the application needs to run.
- `test`: this folder contains tests to check the correct operation of the application.
- `api/controllers`: This directory contains the application's controllers, which are responsible for handling user input and updating the model and view accordingly.
- `api/middleware`: This folder stores intermediate functionalities that act as middelwares for filtering certain requests.
- `api/models`: This directory contains the application's data models, which are responsible for handling data and business logic.
- `api/routes`: This directory contains the application's routing files, which map URLs to specific controllers and actions.
- `api/views`: This directory contains the application's views, which are responsible for displaying data to the user.

## Getting Started

### Run for a development environment

```bash
npm run dev
```

###  Run for a production environment

#### Command Line
> **Note** 
> this version requires to have ports `4000` and `4001` open on the router. This version does not support HTTPS 

```bash
npm run tsc
npm run start
```

#### Docker Compose (preferred)

> **Note** 
>  This version includes `nginx` redirection so the ports that need to be open in the router are `443` and `8443`. This version supports HTTPS.
Compile for docker

  <details>
    <summary><b>Get a certificate<b></summary>
    <details class="nested">
    <summary>Self Signed</summary>

1. Crea una clave privada utilizando el siguiente comando:
```bash
openssl genrsa -out cert.key 2048
```
1. Crea un certificado autofirmado utilizando el siguiente comando:<br>
  Este comando generará un certificado autofirmado válido por 365 días y lo guardará en un archivo llamado "cert.crt". Durante la ejecución del comando se te solicitará que proporciones algunos datos para el certificado. Asegúrate de proporcionar el nombre de dominio correcto en el campo "Common Name".
```bash
openssl req -new -x509 -key cert.key -out cert.crt -days 365
```
1. Verifica que el certificado SSL y la clave privada corresponden utilizando los siguientes comandos:
```
openssl x509 -noout -modulus -in cert.crt | openssl md5
openssl rsa -noout -modulus -in cert.key | openssl md5
```
  </details>
  <details class="nested">
    <summary>Lets Encrypt & Certbot</summary>

Follow the instructions on the following [page](https://certbot.eff.org/)

  </details>
  </details>
<br>

```bash
docker-compose up -d
```

## Learn More

To learn more about Express.js, take a look at the following resources:

- [Express.js Documentation](https://expressjs.com/) - learn about Express.js features

You can check out [the Expressjs GitHub repository](https://github.com/expressjs/express)
