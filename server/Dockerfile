FROM node:20-slim AS builder
WORKDIR /app

# Copy all package.json files for workspace setup
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/
COPY client/package*.json ./client/

# Install all dependencies (sets up workspaces)
RUN npm install

# Copy source files
COPY shared/ ./shared/
COPY server/ ./server/

# Build server (from root using workspace command)
RUN npm run build --workspace=server

# Production image
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
EXPOSE 8080
CMD ["node", "dist/index.js"]
