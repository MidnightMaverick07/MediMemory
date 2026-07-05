# Longitudinal Health Memory Platform (Cognee Cloud Migration)

This monorepo contains a Next.js frontend and a FastAPI backend designed to process clinical records and construct a persistent longitudinal patient health memory graph using **Cognee Cloud**.

## Architecture Overview

```
                                  +-----------------------+
                                  |   Vercel Deployment   |
                                  |   (Next.js Frontend)  |
                                  +-----------+-----------+
                                              |
                                              | HTTPS REST API
                                              v
                                  +-----------+-----------+
                                  |   Render Deployment   |
                                  |   (FastAPI Backend)   |
                                  +-----+-----------+-----+
                                        |           |
            SQLite/Postgres Database    |           | HTTPS REST API (X-Api-Key)
         (Patient Profile/Metadata)     v           v
                          +-------------+---+   +---+-------------+
                          | Managed SQL DB  |   |  Cognee Cloud   |
                          | (e.g. Supabase) |   | (Graph/Vector)  |
                          +-----------------+   +-----------------+
```

The system works across three decoupled components:
1.  **Frontend (Vercel)**: Serves the medical UI and handles file uploads, patient registry, timelines, and graph query forms.
2.  **Backend (Render)**: Standardizes clinical OCR parsing, maps JSON entities, and orchestrates semantic recall and graph consolidation.
3.  **Memory Layer (Cognee Cloud)**: A managed cloud backend that builds, indexes, and queries the clinical knowledge graph.

---

## Service Layout

*   [`/frontend`](./frontend): Next.js single-page application.
*   [`/backend`](./backend): FastAPI service with database models and Cognee API orchestration.

---

## Local Setup

### 1. Backend Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create a `.env` file using the template:
   ```bash
   cp .env.example .env
   ```
3. Set your API credentials:
   ```ini
   GEMINI_API_KEY=your_gemini_api_key
   COGNEE_API_KEY=your_cognee_cloud_api_key
   COGNEE_BASE_URL=https://api.cognee.ai
   DATABASE_URL=sqlite:///./data/app.db
   FRONTEND_URL=http://localhost:3000
   ```
4. Set up a Python 3.11 virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
5. Start the backend:
   ```bash
   uvicorn app.main:app --reload
   ```

### 2. Frontend Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Create a `.env.local` file using the template:
   ```bash
   cp .env.example .env.local
   ```
3. Set your backend URL:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```

---

## Production Deployment Instructions

### Step 1: Deploy Cognee Cloud
1. Log in to your [Cognee Cloud Console](https://console.cognee.ai).
2. Generate a new API Key.
3. Note your API Key and your custom Tenant URL (if any).

### Step 2: Deploy Backend to Render
1. Push the project repository to GitHub.
2. Log in to [Render](https://render.com) and create a new **Web Service**.
3. Point it to your repository.
4. Configure the service settings:
   * **Root Directory**: `backend`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Under Environment Variables, add:
   * `GEMINI_API_KEY` = `<Your Gemini API Key>`
   * `COGNEE_API_KEY` = `<Your Cognee Cloud API Key>`
   * `COGNEE_BASE_URL` = `https://api.cognee.ai` (or your custom tenant URL)
   * `DATABASE_URL` = `<A persistent database connection string, e.g. Supabase or Neon PostgreSQL>`
   * `FRONTEND_URL` = `https://your-app.vercel.app` (your Vercel frontend URL)
6. Trigger the deployment. Take note of the generated Web Service URL (e.g. `https://your-backend.onrender.com`).

### Step 3: Deploy Frontend to Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Select your monorepo repository.
3. Configure the project settings:
   * **Framework Preset**: `Next.js`
   * **Root Directory**: `frontend`
4. Under Environment Variables, add:
   * `NEXT_PUBLIC_API_URL` = `https://your-backend.onrender.com` (your Render backend URL)
5. Click **Deploy**.
