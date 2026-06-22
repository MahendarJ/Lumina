import { getMemories, saveMemories } from './supabase'
import { callWithRetry } from './reliability'

// Build the system prompt with injected memory
// Called before every API request
export async function buildSystemPrompt() {
  const memories = await getMemories()

  const memoryBlock = memories.length
    ? `\n\nWhat you know about this user:\n${memories.map(m => `- ${m.content}`).join('\n')}`
    : ''

  return `You are Lumina, your autonomous AI partner.
You are direct, efficient, and focused on helping the user make progress on their goals.
You have access to web search and a notes tool — use them when needed, not by default.
When using information from a web search, cite your source as: [Source: title, url]
When you are uncertain about something, say so clearly. Prefix uncertain claims with "I think" or "I'm not certain, but".
${memoryBlock}`
}

// After a conversation ends, ask Claude to extract memorable facts
// Runs in the background — does not block the user
export async function extractAndSaveMemories(conversationHistory) {
  if (conversationHistory.length < 4) return // not enough to extract from

  try {
    const response = await callWithRetry(() =>
      fetch(import.meta.env.VITE_API_GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: `Extract important long-term facts about the user from this conversation.
Only extract things that would still be relevant in future conversations (goals, preferences, ongoing projects, personal details).
Do NOT extract things that are only relevant to this specific conversation.
Return a JSON array of short fact strings (max 15 words each), or an empty array [] if nothing important was learned.
Return ONLY the JSON array, no other text.

Conversation:
${conversationHistory.map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n')}`,
            },
          ],
        }),
      }).then(r => r.json())
    )

    const text = response.choices?.[0]?.message?.content || '[]'
    const cleaned = text.replace(/```json|```/g, '').trim()
    const facts = JSON.parse(cleaned)

    if (Array.isArray(facts) && facts.length > 0) {
      await saveMemories(facts)
    }
  } catch (error) {
    console.error('Memory extraction failed (non-blocking):', error)
  }
}