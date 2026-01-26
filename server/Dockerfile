# Development Dockerfile for Agentic Server
# Uses Node.js 20 Alpine for lightweight image

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Expose server port
EXPOSE 3001

# Copy source code (will be overridden by volume mount in development)
COPY . .

# Start server (will use nodemon or similar for hot reload if available)
# In development, source code is mounted as volume for live updates
CMD ["npm", "start"]
