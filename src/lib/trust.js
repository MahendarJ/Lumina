// Extract [Source: title, url] citations from response text
export function parseCitations(text) {
  const citationRegex = /\[Source:\s*([^,]+),\s*(https?:\/\/[^\]]+)\]/g
  const citations = []
  let match

  while ((match = citationRegex.exec(text)) !== null) {
    citations.push({ title: match[1].trim(), url: match[2].trim() })
  }

  // Clean citation markers from the display text
  const cleanText = text.replace(/\[Source:[^\]]+\]/g, '').trim()
  return { cleanText, citations }
}

// Check if the model expressed uncertainty in its response
export function detectConfidence(text) {
  const uncertainPhrases = [
    "I think",
    "I'm not certain",
    "I'm not sure",
    "I believe",
    "might be",
    "probably",
    "I cannot verify",
    "I don't have reliable",
    "as far as I know",
  ]
  const hasUncertainty = uncertainPhrases.some(p =>
    text.toLowerCase().includes(p.toLowerCase())
  )
  return hasUncertainty ? 'low' : 'high'
}

// Format latency for display
export function formatLatency(ms) {
  if (!ms) return ''
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}