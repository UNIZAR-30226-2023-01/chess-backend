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

EXPRESS_SERVER="chess-backend_express"
PROXY_SERVER="chess-backend_nginx"
SERVICE_NAME=$1

if [ "$SERVICE_NAME" == "" ]; then
  echo "Usage: ./deploy.sh [nginx | express]"
  exit 1
fi

if [ "$SERVICE_NAME" = "express" ]; then
  git pull && npm install && npm run tsc
  docker-compose down
  docker rmi $EXPRESS_SERVER
  docker-compose up -d $SERVICE_NAME
elif [ "$SERVICE_NAME" = "nginx" ]; then
  git pull
  docker-compose down
  docker rmi $PROXY_SERVER
  docker-compose up -d $SERVICE_NAME
fi

echo "Done"
exit 0
