FROM alpine:latest

# Compile Stockfish and move it to /bin
RUN apk upgrade && apk add git gcc g++ make
RUN git clone https://github.com/official-stockfish/Stockfish.git
RUN cd Stockfish/src && make -j build ARCH=x86-64-modern && mv stockfish /bin


RUN apk upgrade && apk add nodejs npm
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# If you are building your code for production
# RUN npm ci --save-prod
RUN npm install

# Bundle app source
ENV NODE_ENV=production
COPY ./.env .
COPY ./build .

EXPOSE 4000
EXPOSE 4001

CMD [ "node", "app.js" ]
