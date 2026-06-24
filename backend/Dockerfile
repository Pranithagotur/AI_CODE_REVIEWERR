FROM node:18-slim

# Install compilation tools (g++, make, etc.) for local execution fallback
RUN apt-get update && apt-get install -y \
    g++ \
    default-jdk \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install packages
RUN npm install

# Copy source code
COPY . .

# Compile TypeScript
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
