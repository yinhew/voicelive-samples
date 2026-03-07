# Multi-stage build: Node (frontend) → Maven (build) → JRE (runtime)

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN chmod +x node_modules/.bin/* && npm run build

# Stage 2: Build Java backend
FROM maven:3.9-eclipse-temurin-17 AS backend-build
WORKDIR /build
COPY java/pom.xml .
RUN mvn dependency:go-offline -q
COPY java/src ./src
RUN mvn package -DskipTests -q

# Stage 3: Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy built JAR
COPY --from=backend-build /build/target/voice-live-universal-assistant-1.0.0.jar app.jar

# Copy built frontend into static/ for Spring to serve
RUN mkdir -p /app/static
COPY --from=frontend-build /build/dist /app/static

EXPOSE 8000

CMD ["java", "-jar", "app.jar"]
