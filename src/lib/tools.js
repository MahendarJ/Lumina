import { saveNote, getNotes } from './supabase'
import { callWithRetry, withTimeout } from './reliability'

// TOOL DEFINITIONS — sent to Claude so it knows what's available
export const TOOL_DEFINITIONS = [
  {
    name: 'web_search',
    description: `Search the web for current information, recent events, or facts you are not confident about.
Use this when the user asks about something recent, or when you need to verify a specific fact.
Do NOT use for things you know well already.`,
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'A concise, specific search query (3-6 words works best)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'save_note',
    description: `Save something to the user's notes for future reference.
Use when the user says "remember this", "save this", "note that", or asks you to store information.`,
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title for the note' },
        content: { type: 'string', description: 'Full content of the note' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'get_notes',
    description: `Retrieve the user's saved notes.
Use when the user asks to see their notes, look something up they saved, or refers to something they asked you to remember.`,
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Optional keyword to search notes by. Leave empty to get all recent notes.',
        },
      },
    },
  },
]

// TOOL EXECUTORS — the actual code that runs when Claude picks a tool
export async function executeTool(name, input) {
  try {
    switch (name) {
      case 'web_search':
        return await withTimeout(() => searchWeb(input.query), 8000)
      case 'save_note':
        return await saveNote({ title: input.title, content: input.content })
      case 'get_notes':
        return await getNotes(input.query)
      default:
        return { error: `Unknown tool: ${name}` }
    }
  } catch (error) {
    // Tool failed — return a graceful fallback object instead of crashing
    return {
      error: error.message,
      fallback: true,
      message: `${name} failed. Answering from training knowledge instead.`,
    }
  }
}

async function searchWeb(query) {
  const response = await callWithRetry(() =>
    fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: import.meta.env.VITE_TAVILY_API_KEY,
        query,
        max_results: 3,
        include_answer: true,
      }),
    }).then(r => r.json())
  )

  return {
    query,
    results: response.results?.map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 400),
    })) || [],
    answer: response.answer || null,
  }
}