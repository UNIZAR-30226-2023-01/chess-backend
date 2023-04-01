#!/usr/bin/env bash

# This script is used to deploy the backend services to the server.
# It will pull the latest changes from the git repository, install
# the dependencies and build the project. Then it will remove the
# old docker images and deploy the new ones.

# Usage: ./deploy.sh [service]
# service: all, express, nginx

# The script will exit with a status code of 1 if no service is
# specified. It will exit with a status code of 0 if the deployment
# was successful.

# This scripts needs to be run from the root directory of the project and it 
# requires the following tools to be installed:
# - git
# - npm
# - docker
# - docker-compose
# It also requires that the user has access to the docker daemon and that the
# user is in the docker group.

EXPRESS_SERVER="chess-backend-express"
PROXY_SERVER="chess-backend-nginx"
SERVICE_NAME=$1

if [ "$SERVICE_NAME" == "" ]; then
  echo "Usage: ./deploy.sh [service]"
  exit 1
fi

if [ "$SERVICE_NAME" = "express" ]; then

elif [ "$SERVICE_NAME" = "nginx" ]; then
  # Detener y eliminar el contenedor actual
  docker stop chess-backend-express
  docker rm chess-backend-express

  # Limpiar el sistema de contenedores basura
  docker system prune -f

  # Eliminar la imagen actual
  docker rmi chess-backend-express
  
  # Construir la imagen
  docker-compose up -d nginx

fi

echo "Done"
exit 0


docker rm $(docker stop $(docker ps -a -q --filter ancestor=chess-backend-nginx --format="{{.ID}}")) >/dev/null 2>&1 && docker rmi chess-backend-nginx >/dev/null 2>&1
