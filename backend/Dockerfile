# Stage 1: Build the application using Maven
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy the pom.xml and the source code
COPY pom.xml .
COPY java ./java

# Build the application
RUN mvn clean package -DskipTests

# Stage 2: Create a minimal image to run the app
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the built jar file from the builder stage
COPY --from=builder /app/target/backend-1.0.0.jar app.jar

# Expose the application port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
