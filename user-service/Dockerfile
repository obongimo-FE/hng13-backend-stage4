# Use an official Node.js image. "alpine" is a lightweight version.
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies like typescript)
RUN npm install

# Copy all the source code (src folder, tsconfig.json, etc.)
COPY . .

# Run the build command to compile TypeScript to JavaScript
# This will create a 'dist' folder
RUN npm run build
# (Note: You need to add a "build" script to your package.json: "build": "tsc")

# Use a smaller, production-ready Node.js image
FROM node:18-alpine

WORKDIR /app

# Only copy package.json and package-lock.json
COPY package*.json ./

# Install *only* production dependencies
RUN npm install --production

# Copy the built JavaScript code from the 'builder' stage
COPY --from=builder /app/dist ./dist

# Copy the .env file (we'll manage this better in docker-compose, but good for now)
# COPY .env .

# Expose the port your app runs on
EXPOSE 3002

# The command to run your application
CMD [ "node", "dist/index.js" ]