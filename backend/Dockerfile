# Stage 1: Build the Maven application using JDK 17
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY java ./java

# Package application (skip tests for fast build)
RUN mvn clean package -DskipTests

# Stage 2: Minimal Java Runtime environment
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy compiled JAR artifact from build stage
COPY --from=build /app/target/backend-1.0.0.jar app.jar

# Render assigns a dynamic PORT environment variable (default 8080)
EXPOSE 8080
ENV PORT=8080

ENTRYPOINT ["java", "-jar", "app.jar"]
