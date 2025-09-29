FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev && npm cache clean --force

# Copy application code
COPY server.js start-dev ./

# Make start-dev executable and add to PATH
RUN chmod +x start-dev && \
    mv start-dev /usr/local/bin/start-dev

# Create config directories (both standard and KeyCloak paths)
RUN mkdir -p /config /opt/keycloak/data/import && \
    chown -R node:node /config /opt/keycloak

# Expose port (support both PORT and KC_HTTP_PORT)
EXPOSE 8020

# Run as non-root user
USER node

# Start the application
CMD ["node", "server.js"]