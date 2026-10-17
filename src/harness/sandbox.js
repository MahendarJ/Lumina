// In-memory mock sandbox for the Lumina Agent Harness
// Enables fast, deterministic, offline testing of agent logic, tools, and safety loops.

export class MockSandbox {
  constructor(initialData = {}) {
    this.memories = initialData.memories || []
    this.notes = initialData.notes || []
    this.searchIndex = initialData.searchIndex || {
      'latest quantum computing breakthrough 2026': {
        results: [
          {
            title: 'Nature: 100,000 Qubit Quantum Processor Unveiled',
            url: 'https://nature.com/articles/quantum-processor-breakthrough',
            snippet: 'Researchers have demonstrated a fault-tolerant 100,000 qubit processor operating at 99.99% fidelity.',
          },
          {
            title: 'MIT Tech Review: Quantum Supremacy in Chemical Simulation',
            url: 'https://technologyreview.com/quantum-chemical-sim',
            snippet: 'A milestone in simulating nitrogenase enzyme catalysts for sustainable agriculture.',
          },
        ],
        answer: 'Researchers have unveiled a 100,000-qubit quantum processor demonstrating fault-tolerant chemical simulation.',
      },
      'react 19 release features': {
        results: [
          {
            title: 'React 19 Official Documentation',
            url: 'https://react.dev/blog/2024/react-19',
            snippet: 'React 19 introduces Actions, Server Actions, useActionState, and useOptimistic.',
          },
        ],
        answer: 'React 19 includes Server Actions, useOptimistic, and improved asset loading.',
      },
    }
  }

  // Memory interface
  async getMemories() {
    return [...this.memories]
  }

  async saveMemories(facts) {
    for (const fact of facts) {
      this.memories.push({
        content: fact,
        category: 'extracted',
        created_at: new Date().toISOString(),
      })
    }
  }

  // Notes interface
  async saveNote({ title, content }) {
    const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    const note = { id, title, content, created_at: new Date().toISOString() }
    this.notes.push(note)
    return id
  }

  async getNotes(query = '') {
    if (!query) return [...this.notes]
    const q = query.toLowerCase()
    return this.notes.filter(
      n => (n.title && n.title.toLowerCase().includes(q)) || (n.content && n.content.toLowerCase().includes(q))
    )
  }

  // Web search interface
  async webSearch(query) {
    const normalized = query.toLowerCase().trim()

    // Find best match in mock index
    for (const [key, data] of Object.entries(this.searchIndex)) {
      if (normalized.includes(key) || key.includes(normalized) || key.split(' ').some(k => normalized.includes(k) && k.length > 4)) {
        return {
          query,
          results: data.results,
          answer: data.answer,
        }
      }
    }

    // Default fallback mock results
    return {
      query,
      results: [
        {
          title: `Search Results for "${query}"`,
          url: `https://search.example.com/q?term=${encodeURIComponent(query)}`,
          snippet: `Relevant facts and current information found online regarding ${query}.`,
        },
      ],
      answer: `Found current online information regarding ${query}.`,
    }
  }

  // Tool executor resolver
  getToolExecutor(simulatedToolFailure = null) {
    return async (name, input) => {
      if (simulatedToolFailure && simulatedToolFailure.toolName === name) {
        throw new Error(simulatedToolFailure.errorMessage || `Simulated failure for ${name}`)
      }

      switch (name) {
        case 'web_search':
          return await this.webSearch(input.query)
        case 'save_note':
          return await this.saveNote(input)
        case 'get_notes':
          return await this.getNotes(input.query)
        default:
          return { error: `Unknown tool: ${name}` }
      }
    }
  }

  // Simulated Mock LLM for deterministic offline evaluations
  createMockLLMCaller(scenarioConfig = {}) {
    let callIndex = 0

    return async (messages) => {
      callIndex++
      const lastMsg = messages[messages.length - 1]
      const userMsg = messages.find(m => m.role === 'user')?.content || ''

      // If scenario specifies forced tool loop behavior
      if (scenarioConfig.forceInfiniteToolCalls) {
        return {
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                tool_calls: [
                  {
                    id: `call_${callIndex}`,
                    type: 'function',
                    function: {
                      name: 'web_search',
                      arguments: JSON.stringify({ query: 'infinite loop query' }),
                    },
                  },
                ],
              },
            },
          ],
        }
      }

      // Check if previous message was a tool result
      if (lastMsg.role === 'tool') {
        const toolName = lastMsg.name
        const result = JSON.parse(lastMsg.content || '{}')

        if (toolName === 'web_search') {
          const firstResult = result.results?.[0]
          const title = firstResult?.title || 'Knowledge Base'
          const url = firstResult?.url || 'https://example.com'
          return {
            choices: [
              {
                finish_reason: 'stop',
                message: {
                  role: 'assistant',
                  content: `Based on current reports, ${result.answer || 'here is the information requested.'} [Source: ${title}, ${url}]`,
                },
              },
            ],
          }
        }

        if (toolName === 'save_note') {
          return {
            choices: [
              {
                finish_reason: 'stop',
                message: {
                  role: 'assistant',
                  content: 'I have successfully saved that note to your personal records.',
                },
              },
            ],
          }
        }

        if (toolName === 'get_notes') {
          const notesText = Array.isArray(result) && result.length
            ? result.map(n => `- ${n.title}: ${n.content}`).join('\n')
            : 'No matching notes found.'
          return {
            choices: [
              {
                finish_reason: 'stop',
                message: {
                  role: 'assistant',
                  content: `Here are the notes retrieved from your storage:\n${notesText}`,
                },
              },
            ],
          }
        }
      }

      // First turn reasoning: Determine whether a tool call is needed
      const lowerUser = userMsg.toLowerCase()

      // Should call web search
      if (
        lowerUser.includes('search') ||
        lowerUser.includes('news') ||
        lowerUser.includes('breakthrough') ||
        lowerUser.includes('latest') ||
        lowerUser.includes('current weather')
      ) {
        return {
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                tool_calls: [
                  {
                    id: 'call_search_1',
                    type: 'function',
                    function: {
                      name: 'web_search',
                      arguments: JSON.stringify({ query: userMsg }),
                    },
                  },
                ],
              },
            },
          ],
        }
      }

      // Should call save note
      if (lowerUser.includes('remember') || lowerUser.includes('save this') || lowerUser.includes('note that')) {
        return {
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                tool_calls: [
                  {
                    id: 'call_save_1',
                    type: 'function',
                    function: {
                      name: 'save_note',
                      arguments: JSON.stringify({
                        title: 'User Saved Note',
                        content: userMsg,
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }
      }

      // Should call get notes
      if (lowerUser.includes('what are my notes') || lowerUser.includes('show notes') || lowerUser.includes('get notes')) {
        return {
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                tool_calls: [
                  {
                    id: 'call_get_1',
                    type: 'function',
                    function: {
                      name: 'get_notes',
                      arguments: JSON.stringify({ query: '' }),
                    },
                  },
                ],
              },
            },
          ],
        }
      }

      // Check if system prompt contains memories that should be referenced
      const systemMsg = messages.find(m => m.role === 'system')?.content || ''
      if (systemMsg.includes('User is learning Rust') && lowerUser.includes('recommend a project')) {
        return {
          choices: [
            {
              finish_reason: 'stop',
              message: {
                role: 'assistant',
                content: 'Since you are currently learning Rust, I recommend building a CLI tool like a fast grep clone or a lightweight HTTP reverse proxy.',
              },
            },
          ],
        }
      }

      // Default direct conversational answer (no tools needed)
      return {
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: `The answer is straightforward: ${userMsg.includes('2 + 2') ? '4' : 'I can help you directly with that without needing any external tools.'}`,
            },
          },
        ],
      }
    }
  }
}
