# Base on offical NGINX Alpine image
FROM nginx:alpine

# Remove any existing config files
RUN rm /etc/nginx/conf.d/*

# Copy config files
# *.conf files in conf.d/ dir get included in main config
COPY ./nginx.conf /etc/nginx/conf.d/
# COPY ./cert/fullchain.pem /etc/nginx/fullchain.pem
# COPY ./cert/chain.pem /etc/nginx/chain.pem
# COPY ./cert/cert.pem /etc/nginx/cert.pem
# COPY ./cert/privkey.pem /etc/nginx/privkey.pem

# Expose the listening port
EXPOSE 443
EXPOSE 8443

# Launch NGINX
CMD [ "nginx", "-g", "daemon off;" ]
