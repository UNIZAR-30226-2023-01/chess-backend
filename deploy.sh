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

git pull && npm install && npm run tsc

if [ "$SERVICE_NAME" == "all" ]; then
  echo "Deploying all services"
  echo "Cleaning up old images"
  docker rm $(docker stop $(docker ps -a -q --filter ancestor=${EXPRESS_SERVER} --format='{{.ID}}')) >/dev/null 2>&1 && docker rmi ${EXPRESS_SERVER} >/dev/null 2>&1
  docker rm $(docker stop $(docker ps -a -q --filter ancestor=${PROXY_SERVER} --format='{{.ID}}')) >/dev/null 2>&1 && docker rmi ${PROXY_SERVER} >/dev/null 2>&1
  echo "Deploying new images"
  docker-compose up -d >/dev/null 2>&1
else
  if [ "$SERVICE_NAME" = "express" ]; then
    echo "Usage: ./deploy.sh [EXPRESS_SERVER]"
    echo "Cleaning up old image"
    docker rm $(docker stop $(docker ps -a -q --filter ancestor=${EXPRESS_SERVER} --format="{{.ID}}")) >/dev/null 2>&1 && docker rmi chess-backend-express >/dev/null 2>&1
    echo "Deploying new image"
    docker-compose up -d ${SERVICE_NAME} >/dev/null 2>&1
  elif [ "$SERVICE_NAME" = "nginx" ]; then
    echo "Usage: ./deploy.sh [PROXY_SERVER]"
    echo "Cleaning up old image"
    docker rm $(docker stop $(docker ps -a -q --filter ancestor=${PROXY_SERVER} --format="{{.ID}}")) >/dev/null 2>&1 && docker rmi chess-backend-nginx >/dev/null 2>&1
    echo "Deploying new image"
    docker-compose up -d ${SERVICE_NAME} >/dev/null 2>&1
  fi
fi

echo "Done"
exit 0


docker rm $(docker stop $(docker ps -a -q --filter ancestor="chess-backend-nginx" --format="{{.ID}}")) >/dev/null 2>&1 && docker rmi chess-backend-nginx >/dev/null 2>&1
