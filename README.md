# Writing-Anima

An intelligent writing analysis system powered by Anima's self-orchestrating agent framework. Create personalized writing assistants by uploading example corpora, and receive feedback grounded in specific writing styles and perspectives.

## Overview

Writing-Anima merges:
- **Castor/Anima**: Self-orchestrating AI agent framework with deep corpus grounding
- **Writing Assistant V2**: React-based writing interface with project management

Users can create "writing personas" by uploading corpora (essays, books, emails, etc.), and the system provides feedback in the style and perspective of that corpus. Think of it as having Hemingway, Strunk & White, or your favorite professor review your writing.

## Architecture

```
writing-anima/
├── backend/          # Python FastAPI + Anima orchestration
│   ├── src/
│   │   ├── agent/    # Self-orchestrating agents
│   │   ├── database/ # Qdrant vector database
│   │   ├── corpus/   # Corpus processing
│   │   └── api/      # REST + WebSocket endpoints
│   └── main.py
├── frontend/         # React application
│   └── src/
│       ├── components/
│       ├── services/
│       └── contexts/
└── docker-compose.yml  # Qdrant database
```

## Key Features

### Persona System
- Upload writing corpora (PDF, TXT, MD, DOCX)
- Automatic chunking and vectorization
- Create multiple personas per user
- Isolated vector collections per persona

### Anima-Powered Analysis
- Self-orchestrating retrieval (no hardcoded rules)
- Deep context grounding (160-200 chunks per response)
- Two-stage retrieval (content + style)
- Streaming responses with live status

### Writing Interface
- Rich text editor
- Purpose and criteria definition
- Dialectical inquiry system
- Feedback history tracking
- Project management with Firebase

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- Docker (for Qdrant)
- Firebase project (for auth - [Create one here](https://console.firebase.google.com))
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### 1. Start Qdrant Vector Database

```bash
# From project root
docker-compose up -d qdrant

# Verify it's running
curl http://localhost:6333/health
```

Qdrant dashboard: `http://localhost:6333/dashboard`

### 2. Setup Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys:
# - OPENAI_API_KEY (required)
# - ANTHROPIC_API_KEY (optional, for Claude models)
# - FIREBASE_ADMIN_SDK_PATH (path to Firebase service account JSON)

# Run the server
python main.py
```

Backend runs at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with Firebase config:
# - REACT_APP_FIREBASE_API_KEY
# - REACT_APP_FIREBASE_PROJECT_ID
# - etc. (get these from Firebase Console > Project Settings)

# Run development server
npm start
```

Frontend runs at `http://localhost:3000`

### 4. Create Your First Persona

1. Sign up / Sign in to the app
2. Go to the **Personas** tab
3. Click **"New Persona"**
4. Enter a name (e.g., "Hemingway Style")
5. Upload writing samples (PDF, TXT, MD, DOCX)
6. Wait for ingestion to complete
7. Go to **Writing** tab and select your persona
8. Start writing and click **"Analyze with Anima"**!

## Usage

### Creating a Persona

1. Go to **Persona Manager** tab
2. Click "Create New Persona"
3. Enter name and description (e.g., "Hemingway", "Academic writing style")
4. Upload corpus files (writings in that style)
5. Wait for ingestion to complete

### Getting Feedback

1. Select an active persona
2. Write or paste your content
3. Define purpose and criteria (optional)
4. Click "Get Feedback"
5. Receive streaming feedback grounded in persona corpus

### Managing Projects

- Projects auto-save every 3 seconds
- Associate personas with projects
- View feedback history
- Track writing goals and progress

## How It Works

### Self-Orchestrating Agents

Unlike traditional RAG systems with hardcoded retrieval, Anima agents:
- Decide autonomously when and how to search the corpus
- Perform multi-stage retrieval (content + style)
- Self-terminate when sufficient context is gathered
- Adapt retrieval strategy to query complexity

### Two-Stage Retrieval

1. **Content Search (k=80)**: Find relevant ideas, facts, concepts
2. **Style Search (k=80)**: Find stylistic examples, voice patterns

Total: ~160-200 chunks (~100k+ characters) of grounded context

### Hybrid Search

- **Semantic**: Dense embeddings (text-embedding-3-large, 3072d)
- **Keyword**: BM25 full-text search
- **Fusion**: Reciprocal Rank Fusion (RRF) with 20% bonus for overlap

## API Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.

### Key Endpoints

```
GET    /api/personas           # List personas
POST   /api/personas           # Create persona
POST   /api/personas/{id}/corpus  # Upload corpus
POST   /api/analyze            # Get feedback (JSON)
WS     /api/analyze/stream     # Get feedback (streaming)
```

## Development

### Backend Development

```bash
cd backend
source venv/bin/activate
python main.py  # Auto-reloads on change
```

### Frontend Development

```bash
cd frontend
npm start  # Auto-reloads on change
```

### Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## Configuration

### Backend (.env)

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
QDRANT_HOST=localhost
QDRANT_PORT=6333
FIREBASE_ADMIN_SDK_PATH=./firebase-admin-sdk.json
```

### Frontend (.env)

```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_PROJECT_ID=...
```

## Project Structure

See individual README files:
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)

## Technologies

### Backend
- **FastAPI**: High-performance async API framework
- **Qdrant**: Vector database for embeddings
- **OpenAI**: LLM and embeddings
- **PyPDF**: Document parsing
- **Firebase Admin**: User authentication

### Frontend
- **React 19**: UI framework
- **Tailwind CSS**: Styling
- **Firebase**: Authentication and database
- **Lucide**: Icons

## Roadmap

- [x] Phase 1: Project setup and structure
- [ ] Phase 2: Backend API implementation
- [ ] Phase 3: Frontend persona UI
- [ ] Phase 4: Integration layer
- [ ] Phase 5: Database configuration
- [ ] Phase 6: Testing and polish

## License

MIT

## Credits

- **Anima/Castor**: Self-orchestrating agent framework
- **Writing Assistant V2**: Original React UI and features
