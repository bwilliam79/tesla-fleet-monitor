FROM node:18-alpine

WORKDIR /app

# Install backend dependencies
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install

# Install frontend dependencies
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Copy backend source
WORKDIR /app
COPY backend/src ./backend/src

# Build frontend
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public
WORKDIR /app/frontend
RUN npm run build

# Final stage
WORKDIR /app
EXPOSE 3001

# Start backend (frontend is served by backend)
CMD ["node", "backend/src/index.js"]
