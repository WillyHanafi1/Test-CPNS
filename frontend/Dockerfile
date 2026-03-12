FROM node:18-alpine

WORKDIR /app

# Copy package info
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all code
COPY . .

# Build Next.js app
# In production, we usually use environment variables during build
# but we can also use runtime envs in many setups.
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
