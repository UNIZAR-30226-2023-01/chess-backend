# chess-backend  [![Production CI](https://github.com/UNIZAR-30226-01/chess-backend/actions/workflows/production.yml/badge.svg)](https://github.com/UNIZAR-30226-01/chess-backend/actions/workflows/production.yml)

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
- `test`: This folder contains tests to check the correct operation of the application.
- `lib`: This folder contains modules with very specific functionality or collections of functions used repeatedly by controllers.
- `api_server/controllers`: This directory contains the application's controllers, which are responsible for handling user input and updating the model and view accordingly.
- `api_server/middleware`: This folder stores intermediate functionalities that act as middelwares for filtering certain requests.
- `api_server/models`: This directory contains the application's data models, which are responsible for handling data and business logic.
- `api_server/routes`: This directory contains the application's routing files, which map URLs to specific controllers and actions.

## Naming convention

- `ALL_CAPS` for constants (e.g: `GAME_OVER_TTL`)
- `camelCase` for variable names and object properties
- `PascalCase` for type names and classes (e.g: `ChessTimer`)
- `kebab-case` for module names (e.g: `restore-queue`)
- `kebab-case` with `namespaces` sintax for Redis string keys (e.g: `token-blacklist:user`)

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

Follow the instructions on the following [page](https://certbot.eff.org/) to get a certificate.

```bash
make -p nginx/certs
sudo cp  /etc/letsencrypt/live/api.gracehopper.xyz/* nginx/certs
```

```bash
docker-compose up -d
```

## Learn More

To learn more about Express.js, take a look at the following resources:

- [Express.js Documentation](https://expressjs.com/) - learn about Express.js features

You can check out [the Expressjs GitHub repository](https://github.com/expressjs/express)
