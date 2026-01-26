# Development Dockerfile for Agentic Client
# Uses Node.js 20 Alpine for lightweight image

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Expose Vite dev server port
EXPOSE 3000

# Copy source code (will be overridden by volume mount in development)
COPY . .

# Start Vite dev server with host binding to allow external access
# In development, source code is mounted as volume for live updates
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
