import { useState } from 'react'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  return (
    <div className="chat-input-row">
      <textarea
        className="chat-input"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Lumina anything... (Enter to send, Shift+Enter for new line)"
        disabled={disabled}
        rows={1}
      />
      <button
        className="send-btn"
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
      >
        Send
      </button>
    </div>
  )
}