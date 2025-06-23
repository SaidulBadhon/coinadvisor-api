FROM oven/bun:1 AS base
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN bun install

# Copy source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["bun", "run", "dev"]