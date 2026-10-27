<div align="center">

# 🤖 Chatbot Builder

**Enterprise-Grade Multi-Tenant Custom Chatbot Studio & Grounded RAG Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16%20App%20Router-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Pinecone](https://img.shields.io/badge/Vector%20DB-Pinecone%20Serverless-000000?style=flat-square)](https://www.pinecone.io/)
[![Google Gemini](https://img.shields.io/badge/LLM-Gemini%201.5%20Pro%2FFlash-8E75C2?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quickstart">Quickstart</a> •
  <a href="#-widget-embed-sdk">Widget SDK</a> •
  <a href="#-security--multi-tenancy">Security</a> •
  <a href="#-contributing">Contributing</a>
</p>

</div>

---

## 💡 Overview

**Chatbot Builder** is a modern, full-stack, multi-tenant AI chatbot creation platform. It allows businesses and developers to create domain-specific conversational AI agents grounded in their proprietary documents and websites.

Featuring an **interactive 3-step creation wizard**, **direct multipart file ingestion with zero-disk retention**, **page-level grounded citation pills**, and an **embeddable zero-dependency client widget**, Chatbot Builder bridges the gap between raw LLMs and production enterprise search and support workflows.

---

## ✨ Key Features

- ⚡ **Dual Creation Tracks**:
  - **Instant Bot**: 1-click web crawling and automatic persona synthesis.
  - **Custom Bot**: 3-step onboarding wizard configuring personality, system instructions, BYOK credentials, and custom file uploads.
- 📚 **Multi-Source Ingestion Pipeline**:
  - Direct multipart streaming upload via Express Multer memory storage.
  - Native parsing for **PDF**, **DOCX**, **TXT**, **CSV**, **Markdown**, and **HTML**.
  - Object persistence in Backblaze B2 (S3-compatible) with presigned token authorization.
- 🧠 **Precision RAG with Canonical Citations**:
  - Semantic chunking via LangChain recursive character splitting (1,000 characters with 200 overlap).
  - High-density 768-dimensional embeddings generated with `text-embedding-004`.
  - Canonical citations protocol (`[doc://<source_id>#page=<page_number>]`) rendered as interactive badges with an instant **Grounded Evidence Modal**.
- 🔒 **Enterprise Multi-Tenant Isolation**:
  - Cryptographic **AES-256-GCM** envelope encryption for Bring-Your-Own-Key (BYOK) model keys (Gemini, OpenAI, Anthropic).
  - Multi-tenant vector partitioning: each chatbot operates inside an isolated Pinecone namespace (`bot_{chatbot_id}`).
  - Strict organization-scoped queries and JWT authorization filters.
- 🌐 **Embeddable Drop-In Widget**:
  - Lightweight, responsive chat widget for external client websites.
  - Secure iframe isolation, mobile responsive drawers, unauthenticated public API config, and session rate limiters.
- 📊 **Studio Parity & Playground**:
  - Real-time token streaming using Server-Sent Events (SSE).
  - Live document management hub with real-time status transitions (`PENDING` &rarr; `PROCESSING` &rarr; `INDEXED`).

---

## 🏗️ Architecture

```
                                  [ User / Client Browser ]
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
          (Studio Dashboard & Admin)                         (Embeddable Widget)
             Next.js 16 App Router                        Iframe / Floating Bubble
                     │                                                 │
                     └────────────────────────┬────────────────────────┘
                                              │  HTTPS / SSE Streaming
                                              ▼
                                   [ Express API Backend ]
                                     Node.js / TypeScript
                                - Auth, RBAC, Tenant Scoping
                                - AES-256-GCM Key Decryption
                                - Multer Streaming to B2
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
              [MongoDB Database]                              [Backblaze B2]
         Tenants, Bots, Sources, Chats                    Encrypted Document Store
                      │
                      │ HTTP Multipart / Token Stream
                      ▼
             [FastAPI AI Service]
              Python 3.11 / LangChain
         - PyPDF, python-docx, BS4 Parsers
         - Recursive Character Chunker
         - Gemini 1.5 Flash / Pro Synthesis
                      │
                      ▼
            [Pinecone Serverless]
       Namespace: bot_{chatbot_id} (768-dim)
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Studio** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend API** | Node.js 20 LTS, Express, TypeScript, Mongoose, Multer, AWS SDK (S3 Client for B2), Zod |
| **AI & RAG Engine** | Python 3.11, FastAPI, Uvicorn, LangChain, PyPDF, python-docx, BeautifulSoup4, Pydantic |
| **Vector Storage** | Pinecone Serverless (AWS `us-east-1`, dimension: 768, cosine metric) |
| **Primary Database** | MongoDB Atlas / Local MongoDB 7.0 |
| **Object Storage** | Backblaze B2 (S3-compatible, private ACL, presigned URL access) |
| **LLMs & Embeddings** | Google Gemini 1.5 Pro & Flash, `text-embedding-004` (with extensible OpenAI/Anthropic support) |

---

## 🚀 Quickstart

### Prerequisites
- **Node.js** v20.x or higher
- **Python** 3.11 or higher
- **MongoDB** instance (local or Atlas)
- **Pinecone** API Key ([pinecone.io](https://www.pinecone.io/))
- **Google AI Studio** Gemini API Key ([aistudio.google.com](https://aistudio.google.com/))
- **Backblaze B2** account ([backblaze.com/b2](https://www.backblaze.com/b2/))

---

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/chatbot-builder.git
cd chatbot-builder
```

---

### 2. Configure Environment Variables

Create `.env` files in each service directory following their respective `.env.example` templates:

#### Backend (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/chatbot_builder
JWT_SECRET=replace_with_a_secure_jwt_secret_at_least_32_characters
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
B2_KEY_ID=your_backblaze_key_id
B2_APPLICATION_KEY=your_backblaze_app_key
B2_BUCKET_NAME=your_b2_bucket_name
B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
AI_SERVICE_URL=http://localhost:8000
```

#### AI Service (`ai-service/.env`):
```env
ENVIRONMENT=development
PORT=8000
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=chatbot-builder
GEMINI_API_KEY=your_google_gemini_api_key
BACKEND_API_URL=http://localhost:5000
```

#### Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

### 3. Install & Start Services

#### A. AI Service (Python FastAPI)
```bash
cd ai-service
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
python run.py
# Running on http://localhost:8000
```

#### B. Backend API (Node.js Express)
```bash
cd ../backend
npm install
npm run dev
# Running on http://localhost:5000
```

#### C. Frontend (Next.js 16)
```bash
cd ../frontend
npm install
npm run dev
# Running on http://localhost:3000
```

---

## 🧪 Testing & Verification

The platform maintains an automated test suite across all services:

```bash
# 1. Run AI Service Unit & Ingestion Tests (116 tests)
cd ai-service
pytest -v

# 2. Typecheck Backend
cd ../backend
npx tsc --noEmit

# 3. Typecheck Frontend
cd ../frontend
npx tsc --noEmit
```

---

## 🌐 Widget Embed SDK

Integrate any published chatbot into any client website with a single HTML script tag:

```html
<!-- Place before the closing </body> tag -->
<script
  src="https://app.yourdomain.com/widget.js"
  data-chatbot-id="YOUR_BOT_PUBLIC_ID"
  async>
</script>
```

The script automatically injects an isolated floating bubble launcher, fetches bot branding parameters without authentication, and expands into a responsive, touch-friendly chat drawer.

---

## 🔒 Security & Multi-Tenancy

- **Zero-Disk Ephemeral File Intake**: Uploaded knowledge sources are streamed into memory buffers and pushed directly to Backblaze B2. Any temporary OCR processing files are wiped in Python `finally{}` blocks.
- **AES-256-GCM Envelope Encryption**: Customer-provided LLM credentials are never stored in plaintext and exist in volatile memory only during prompt synthesis.
- **Mathematical Vector Isolation**: Semantic embeddings reside in isolated namespaces (`bot_{chatbot_id}`). Cross-tenant data retrieval is impossible at the index level.
- **CORS & Rate Protection**: Public widget endpoints enforce per-session rate limits, protecting tenants from automated credit exhaustion.

---

## 🗺️ Roadmap

- [x] Multi-format file ingestion (PDF, DOCX, TXT, CSV, HTML)
- [x] Canonical grounding citations with interactive evidence modal
- [x] Bring-Your-Own-Key (BYOK) AES-256-GCM encryption
- [x] Server-Sent Events (SSE) real-time token streaming
- [x] Embeddable zero-dependency website widget
- [ ] Multi-document batch upload with chunk diff preview
- [ ] Automated scheduled website recrawling
- [ ] Slack & Discord bot integrations
- [ ] Multi-model comparative evaluation arena

---

## 🤝 Contributing

Contributions make the open-source community an inspiring place to learn, create, and build. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ for developers building production-ready AI applications.</sub>
</div>
