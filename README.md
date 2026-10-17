# ⚡ Lumina - Your Autonomous AI Partner

Lumina is an advanced, personalized AI assistant built with React and Vite. Unlike traditional Retrieval-Augmented Generation (RAG) systems that rely on static document databases, Lumina functions as an **Autonomous Agent with Long-Term Memory**. 

It dynamically learns about you over time, manages its own memory context, and iteratively uses tools to provide deeply personalized and accurate responses.

## ✨ Key Features

- **🧠 Automated Memory Curation:** Lumina runs a silent background process after your conversations to extract long-term facts, goals, and preferences about you, saving them to its memory.
- **🔄 Agentic Orchestration Loop:** Instead of a single query-response cycle, Lumina acts autonomously. It decides when to search the web, read your notes, evaluate information, and synthesize an answer (running up to 5 loops per turn).
- **💉 Dynamic Prompt Injection:** Lumina injects its curated facts directly into the underlying System Prompt before every request. This ensures it always has your core context "top of mind" without needing explicit semantic searches.
- **🛡️ Built-in Trust Mechanics:** Includes active citation parsing from web searches, confidence detection logic, and response logging for transparent evaluation.
- **📱 Modern UI:** A beautiful, responsive interface with features for tracking conversation history, managing memories/notes, and an evaluation dashboard.

## 🛠️ Technology Stack

- **Frontend:** React + Vite
- **Styling:** Vanilla CSS 
- **Database / Auth:** Supabase (for storing long-term memories and logging conversation evaluations)
- **AI Orchestration:** Groq API (utilizing Llama 3.3 for background memory extraction and dynamic tool usage)
- **Linting:** ESLint
- **Deployment:** Pre-configured for Vercel (`vercel.json`) and Netlify (`netlify.toml`)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Supabase Account and Project
- Groq API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd lumina
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add the following keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_GROQ_URL=https://api.groq.com/openai/v1/chat/completions
   VITE_GROQ_API_KEY=your_groq_api_key
   VITE_GROQ_MODEL=llama3-70b-8192
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

5. **Build for Production:**
   ```bash
   npm run build
   ```

### Deployment

Lumina includes configuration files for seamless deployment to modern hosting platforms:

- **Vercel:** Uses `vercel.json` to handle Single Page Application (SPA) routing.
- **Netlify:** Uses `netlify.toml` to define build commands and handle SPA routing.

*Note: Remember to add your `.env` variables to the respective platform's dashboard before deploying.*

## 🧪 Autonomous Agent Evaluation & Test Harness

Lumina includes a built-in **Agent Harness & Benchmark Suite** located in `src/harness/`. It allows you to systematically evaluate, benchmark, and stress-test the agent headless from the command line:

```bash
# Run the benchmark test suite (in-memory mock sandbox, zero-cost, runs in milliseconds)
npm run test:harness

# Run live against real Groq & external APIs (requires .env)
npm run test:harness:live

# Filter by scenario or category
node src/harness/runner.js --category=tool_routing
node src/harness/runner.js --scenario=BM-01-TOOL-SEARCH
```

### Benchmark Test Coverage

| Scenario ID | Category | Objective |
| :--- | :--- | :--- |
| `BM-01-TOOL-SEARCH` | `tool_routing` | Verifies the agent invokes `web_search` for fresh/current external facts |
| `BM-02-TOOL-SAVE-NOTE` | `tool_routing` | Verifies the agent invokes `save_note` when instructed to remember information |
| `BM-03-TOOL-GET-NOTES` | `tool_routing` | Verifies the agent invokes `get_notes` to retrieve stored personal notes |
| `BM-04-NO-TOOL` | `tool_routing` | Verifies the agent solves direct math/reasoning without unnecessary tool calls |
| `BM-05-CITATION` | `grounding_citation` | Verifies that search results produce structured `[Source: title, url]` citations |
| `BM-06-MEMORY-RECALL` | `memory_injection` | Verifies injected user facts are recognized and used during conversation |
| `BM-07-TOOL-FAILURE-GRACEFUL` | `guardrails_safety` | Verifies graceful error recovery when a tool throws a network/API exception |
| `BM-08-MAX-LOOPS-CAP` | `guardrails_safety` | Enforces the 5-iteration loop cap to prevent runaway tool loops |

Each run exports a complete trajectory trace log to `src/harness/reports/latest-eval-report.json`.

## 🏗️ Architecture Highlight

Lumina decouples the autonomous agent core from the UI:
- **`src/core/agent.js` (`LuminaAgent`)**: The headless agent engine handling the orchestration loop, tool dispatch, guardrails, trajectory recording, and prompt injection. It runs anywhere (Node.js CLI, tests, CI/CD, React UI).
- **`src/harness/`**: The testing and evaluation harness providing mock sandboxes (`sandbox.js`), benchmark scenarios (`scenarios.js`), trajectory assertion evaluator (`evaluator.js`), and CLI runner (`runner.js`).
- **`src/lib/`**: Reliability helpers (exponential backoff, timeouts), trust scoring, and external provider integrations.

---
*Built as a true "Autonomous AI Partner" that learns, adapts, and works autonomously.*
