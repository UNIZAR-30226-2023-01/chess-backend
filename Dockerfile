FROM node:lts-alpine

# Install build dependencies and compile Stockfish
RUN apk update && apk upgrade && \
    apk add git gcc g++ make util-linux && \
    npm install -g npm@latest && \
    git clone https://github.com/official-stockfish/Stockfish.git
COPY stockfish-compile.sh Stockfish/src
RUN cd Stockfish/src && chmod u+x stockfish-compile.sh \
  && ./stockfish-compile.sh && mv stockfish /bin && make clean && cd

# Create a non-root user
RUN addgroup -S gracehopper && adduser -S gracehopper -G gracehopper

# Set the working directory for the app
WORKDIR /usr/src/app

# Give ownership of the working directory to the non-root user
RUN chown -R gracehopper:gracehopper /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy the built app source
COPY ./build .

# Expose the required ports
EXPOSE 4000
EXPOSE 4001

# Switch to the non-root user before running the app
USER gracehopper

# Run the Node.js app
CMD ["node", "app.js"]