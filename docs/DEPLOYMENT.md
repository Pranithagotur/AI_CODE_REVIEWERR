# Deployment Guide: AI-Based Code Review System

This document provides step-by-step instructions for deploying the **ReviewLLM** system locally, using Docker Compose, and launching the VS Code extension.

---

## 1. Prerequisites

Ensure you have the following software installed:
- **Node.js** (v18.x or higher) & **npm** (v9.x or higher)
- **Docker Desktop** (optional, recommended for isolated sandbox containers)
- **MySQL Server** (optional, fallback SQLite database is auto-configured)
- **Visual Studio Code** (for running the extension)

---

## 2. Environment Configuration

Create a `.env` file inside the `backend/` folder to configure API tokens and database connections.

```bash
# path: backend/.env

PORT=5000
JWT_SECRET=super_secret_key_12345

# AI Integration
GEMINI_API_KEY=your_gemini_api_key_here

# Database Settings
USE_MYSQL=false
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=code_review_db
```

> [!NOTE]
> If `USE_MYSQL` is set to `false` (or connection fails), the backend will automatically instantiate an embedded SQLite file named `database.sqlite` and seed it with rule patterns.

---

## 3. Local Development Deployment

### 3.1 Start the Backend Server
1. Navigate to the `backend/` folder:
   ```bash
   cd backend
   ```
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Start the Express server in development mode:
   ```bash
   npm run dev
   ```
   The server will print: `Server listening on port 5000` and `Database system initialized successfully.`

### 3.2 Start the Frontend Dashboard
1. Navigate to the `frontend/` folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the displayed address in your web browser (typically `http://localhost:5173`).

---

## 4. Docker Compose Deployment (Production Mode)

We provide a `docker-compose.yml` file in the root workspace directory that spins up a MySQL container and the Node.js API container.

To deploy using Docker:
1. Ensure Docker Desktop is running.
2. In the root workspace, run:
   ```bash
   docker-compose up --build
   ```
3. Docker will build the backend container and link it with the MySQL container. The database schema will be initialized.

---

## 5. VS Code Extension Deployment

To run and test the lightweight VS Code extension:
1. Open Visual Studio Code.
2. Open the `extension/` folder in VS Code.
3. Open a terminal inside the extension folder and install dependencies:
   ```bash
   npm install
   ```
4. Press **F5** (or go to `Run and Debug` -> `Run Extension`). This launches a new "Extension Development Host" window.
5. In the new window, open any JavaScript, Python, C++, or Java file.
6. Open the Command Palette (**Ctrl+Shift+P** or **Cmd+Shift+P**) and select:
   `ReviewLLM: Review Current File`.
7. You should see warning marks (wavy underlines) appear. Hovering over a marked line will display the AI review comments.
8. Customize the settings by navigating to VS Code Settings and searching for `ReviewLLM`.
