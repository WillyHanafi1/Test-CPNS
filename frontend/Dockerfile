FROM node:18-alpine

WORKDIR /app

# Copy package info
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all code
COPY . .

# ARGs are needed because NEXT_PUBLIC vars are baked into the build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MIDTRANS_CLIENT_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=$NEXT_PUBLIC_MIDTRANS_CLIENT_KEY

# Build Next.js app in standalone mode
RUN npm run build

# Copy static assets to standalone folder as Next.js doesn't do it by default
RUN cp -r public .next/standalone/ || true
RUN mkdir -p .next/standalone/.next
RUN cp -r .next/static .next/standalone/.next/ || true

# Change working directory to the standalone output
WORKDIR /app/.next/standalone

# Set runtime environment variables
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Expose port
EXPOSE 3000

# Set user to non-root for security
# Ensure the node user can access the copied files
USER node

# Start application
CMD ["node", "server.js"]
