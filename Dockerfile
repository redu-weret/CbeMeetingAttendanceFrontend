# Stage 1: Build the React app (TypeScript + Vite)
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first so this layer is cached
COPY package.json package-lock.json ./
RUN npm ci

# Build the production bundle into /app/dist
COPY . .
RUN npm run build

# Stage 2: Serve the static bundle with Nginx
FROM nginx:alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
