# ── Stage 1: Build ──────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copy Maven wrapper and POM first (layer caching for dependencies)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source and build the JAR
COPY src/ src/
RUN ./mvnw package -DskipTests -B

# ── Stage 2: Run ────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8082

ENTRYPOINT ["java", "-jar", \
            "-Xmx400m", "-Xms200m", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "app.jar"]
