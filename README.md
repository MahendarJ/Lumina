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

## 🏗️ Architecture Highlight

Lumina bypasses standard RAG limitations. Rather than just doing vector searches on user input, it leverages `src/lib/memory.js` to proactively learn and update a user profile. It then uses an orchestration loop in `src/lib/groq.js` to intelligently determine whether it needs to invoke tools like **Web Search** or **Notes Retrieval** before responding to the user.

---
*Built as a true "Autonomous AI Partner" that learns, adapts, and works autonomously.*
