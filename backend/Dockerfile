# Stage 1: Build the Maven application using JDK 17
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Package application (skip tests for fast build)
RUN mvn clean package -DskipTests

# Stage 2: Minimal Java Runtime environment
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy compiled JAR artifact from build stage
COPY --from=build /app/target/*.jar app.jar

# Render assigns a dynamic PORT environment variable
EXPOSE 8080
ENV PORT=8080

# Limit JVM memory to fit within Render free tier (512MB total RAM)
# -Xms64m: start with 64MB heap
# -Xmx256m: max 256MB heap
# -XX:+UseSerialGC: lower GC overhead (single-threaded, suits low-CPU env)
# -XX:MaxMetaspaceSize=128m: cap Metaspace
ENTRYPOINT ["java", \
  "-Xms64m", "-Xmx256m", \
  "-XX:+UseSerialGC", \
  "-XX:MaxMetaspaceSize=128m", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
