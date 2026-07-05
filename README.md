# MediMemory: Longitudinal Patient Health Memory Platform

MediMemory is an intelligent clinical platform that consolidates unstructured medical records (PDFs, scans, discharge summaries) into a unified, queryable **Longitudinal Patient Health Memory Graph** powered by **Cognee Cloud** and **Gemini Pro**.

---

## The Problem

In modern healthcare, a patient's clinical history is scattered across different Electronic Health Record (EHR) systems, unstructured lab reports, and handwritten notes. 

* **Clinical Fragmentation**: A doctor reviewing a patient's file often faces dozens of isolated PDF reports. Synthesizing this information chronologically under time constraints is prone to error.
* **Hidden Connections**: Subtle, critical links, such as a past adverse reaction to a drug class or a progressive symptom trend across multiple consults, remain buried in raw text.
* **Cognitive Load**: Clinicians lack a semantic search interface. They cannot ask natural language questions about a patient's entire history or view how medications and conditions map together dynamically.

### The MediMemory Solution
MediMemory parses raw medical text using Multi-Modal LLMs (Gemini Pro), standardizes clinical entities (diseases, drugs, procedures, labs), and feeds them into a semantic graph schema (Cognee Cloud). This creates a **persistent memory network** that matures with every new document uploaded, turning fragmented history into an interactive clinical graph.

---

## System Architecture

The monorepo operates across three decoupled service layers:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER (Vercel)                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                    Next.js 15+ SPA Client                      │   │
│   │  • Doctor Portal (Graph Explorer, Ledgers, Ask AI Memory)      │   │
│   │  • Patient Portal (Health Timeline, Evolution, PDF Uploads)    │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ HTTPS REST API
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SERVICES LAYER (Render)                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                         FastAPI Server                         │   │
│   │  • OCR Clinical Parsing / Extraction (Gemini Pro)              │   │
│   │  • SQLite / PostgreSQL Patient Metadata Ledger                 │   │
│   │  • Cognee Graph & Vector Engine Orchestration                  │   │
│   └───────────────────────┬───────────────┬────────────────────────┘   │
└───────────────────────────┼───────────────┼────────────────────────────┘
                            │               │ HTTPS / Auth
     Reads/Writes Profiles  │               │ (X-Api-Key)
                            ▼               ▼
                   ┌────────────────┐  ┌─────────────────────────┐
                   │ Managed SQL DB │  │   COGNEE CLOUD ENGINE   │
                   │ (Supabase/PG)  │  │  • Entity Linking       │
                   │                │  │  • Graph DB Indexing    │
                   │                │  │  • Vector DB Embeddings │
                   └────────────────┘  └─────────────────────────┘
```

---

## Core Capabilities

### 1. Interactive Relationship Explorer
* Renders a live, interactive 2D graph of the patient's entire medical record using force-directed graph layouts.
* Color-coded semantic nodes represent **Patients**, **Diseases/Conditions**, **Medications**, **Allergies**, **Labs**, and **Surgeries**.
* Path highlighting filters nodes based on categorical parameters (e.g. highlights only medications or only surgeries).

### 2. Clinical Memory Timeline & Evolution
* Renders a chronological history of a patient's medical consults, diagnoses, and treatments.
* Summarizes key semantic highlights from clinical notes with reference documents attached.

### 3. Dedicated Medications & Conditions Ledgers (Doctor Mode)
* **Medications Ledger**: Chronological log of all prescribed medications. Links each medication back to its indicated disease and the doctor who prescribed it, including direct citations to the reference PDF report.
* **Conditions Ledger**: Master index of active and chronic diagnoses, tracking date of onset, treatment mapping (medications), and clinical providers.

### 4. Natural Language Queries (Ask AI Memory)
* Allows clinicians to query a patient's memory graph using semantic RAG.
* Ask questions like: *"Which medication did the patient start after their diabetes diagnosis?"* or *"Does the patient have any recorded reactions to Penicillin?"*

---

## Local Development Setup

### 1. Backend Service (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create your local environment configuration:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your API credentials:
   ```ini
   GEMINI_API_KEY=your_gemini_api_key
   COGNEE_API_KEY=your_cognee_cloud_api_key
   COGNEE_BASE_URL=https://api.cognee.ai
   DATABASE_URL=sqlite:///./data/app.db
   FRONTEND_URL=http://localhost:3000
   ```
4. Create a Python virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Mac/Linux:
   source .venv/bin/activate

   pip install -r requirements.txt
   ```
5. Spin up the local API server:
   ```bash
   uvicorn app.main:app --reload
   ```

### 2. Frontend Web App (Next.js)
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Create your environment configuration:
   ```bash
   cp .env.example .env.local
   ```
3. Confirm the local API URL endpoint:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Install package dependencies and start the development server:
   ```bash
   npm install
   npm run dev
   ```
5. Open your browser to `http://localhost:3000` to interact with the platform.

---

## Production Deployment Instructions

### Step 1: Initialize Cognee Cloud
1. Register/Log in to the [Cognee Cloud Console](https://console.cognee.ai).
2. Generate an API Key under your settings panel.

### Step 2: Deploy the FastAPI Backend to Render
1. Create a new **Web Service** on Render and connect your repository fork.
2. Set the following configuration parameters:
   * **Root Directory**: `backend`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add the required Environment Variables:
   * `GEMINI_API_KEY` = `<Your Gemini API Key>`
   * `COGNEE_API_KEY` = `<Your Cognee Cloud API Key>`
   * `COGNEE_BASE_URL` = `https://api.cognee.ai`
   * `DATABASE_URL` = `<A persistent PostgreSQL connection string>`
   * `FRONTEND_URL` = `https://your-frontend.vercel.app`

### Step 3: Deploy the Next.js Frontend to Vercel
1. Create a new project in Vercel and link your repository fork.
2. Set the following configuration parameters:
   * **Framework Preset**: `Next.js`
   * **Root Directory**: `frontend`
3. Add the environment variable:
   * `NEXT_PUBLIC_API_URL` = `https://your-backend.onrender.com` (Render Web Service URL)
4. Deploy the project.

---

## AI Assistance Disclosure

This project was built with the help of AI assistants (Antigravity) for:
- Debugging and refining backend/frontend code
- UI polish and refactoring suggestions
- Drafting documentation and blog content

All architecture decisions, feature design, and core implementation were done by the project author. AI tools were used as a coding aid, not as the primary builder.
