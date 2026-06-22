import { useState } from 'react'
import { rateResponse } from '../lib/supabase'
import { formatLatency } from '../lib/trust'

export default function ChatBubble({ message }) {
  const [rating, setRating] = useState(null)

  const handleRate = async (value) => {
    setRating(value)
    await rateResponse(message.logId, value)
  }

  if (message.role === 'user') {
    return (
      <div className="bubble bubble-user">
        <p>{message.text}</p>
      </div>
    )
  }

  return (
    <div className="bubble bubble-assistant">
      <p style={{ whiteSpace: 'pre-wrap' }}>{message.text}</p>

      {/* Confidence badge — only shown when model expressed uncertainty */}
      {message.confidence === 'low' && (
        <div className="badge badge-warning">
          ⚠ Uncertain — worth verifying
        </div>
      )}

      {/* Tools used indicator */}
      {message.toolsUsed?.length > 0 && (
        <div className="tools-used">
          {message.toolsUsed.map((t, i) => (
            <span key={i} className="tool-pill">
              {t === 'web_search' ? '🔍 Web search' : t === 'save_note' ? '📝 Saved note' : '📋 Got notes'}
            </span>
          ))}
        </div>
      )}

      {/* Source citations — rendered as clickable links */}
      {message.citations?.length > 0 && (
        <div className="citations">
          <span className="citations-label">Sources:</span>
          {message.citations.map((c, i) => (
            <a key={i} href={c.url} target="_blank" rel="noreferrer" className="citation-link">
              {c.title}
            </a>
          ))}
        </div>
      )}

      {/* Eval rating + latency */}
      <div className="bubble-footer">
        <span className="latency">{formatLatency(message.latencyMs)}</span>
        <div className="rating-buttons">
          <button
            className={`rating-btn ${rating === 1 ? 'active' : ''}`}
            onClick={() => handleRate(1)}
            title="Good response"
          >
            👍
          </button>
          <button
            className={`rating-btn ${rating === -1 ? 'active' : ''}`}
            onClick={() => handleRate(-1)}
            title="Bad response"
          >
            👎
          </button>
        </div>
      </div>
    </div>
  )
}