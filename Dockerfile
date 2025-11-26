FROM node:18-alpine as builder
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci --silent

# Copy sources and build
COPY . .
RUN npm run build

FROM nginx:stable-alpine
# Remove default nginx static (if any) and copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy entrypoint that generates runtime env file
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
