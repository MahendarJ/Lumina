// Retry with exponential backoff
// attempt 1 → wait 1s → attempt 2 → wait 2s → attempt 3 → fail
export async function callWithRetry(fn, maxRetries = 3) {
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

// Cancel a slow operation after a time limit
export async function withTimeout(fn, ms = 8000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  )
  return Promise.race([fn(), timeout])
}

// Keep conversation history within a safe limit
// Always keeps the first message (often has key context)
// Then takes the most recent messages to fill the rest
export function trimContext(messages, maxMessages = 20) {
  if (messages.length <= maxMessages) return messages
  const first = messages[0]
  const recent = messages.slice(-(maxMessages - 1))
  return [first, ...recent]
}

// Friendly error messages to show users
export function getUserFriendlyError(error) {
  const msg = (error?.message || '').toLowerCase()
  if (msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('429'))
    return "I've hit a rate limit with my AI provider. Please try again in a few minutes!"
  if (msg.includes('timed out'))
    return "That took too long. Let me try a simpler approach."
  if (msg.includes('tool'))
    return "I couldn't fetch that information, but here's what I know:"
  return "Something went wrong. Let me try that differently."
}