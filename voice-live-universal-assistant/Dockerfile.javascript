# Multi-stage build: Node (frontend) → Node (backend)

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN npm run build

# Stage 2: Node.js runtime
FROM node:20-alpine
WORKDIR /app

# Install production dependencies
COPY javascript/package.json javascript/package-lock.json* ./
RUN npm ci --production

# Copy backend source
COPY javascript/ .

# Copy built frontend into static/ for Express to serve
COPY --from=frontend-build /build/dist ./static

EXPOSE 8000

CMD ["node", "app.js"]
