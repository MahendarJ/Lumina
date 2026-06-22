import { useState } from 'react'
import ChatBubble from './components/ChatBubble'
import ChatInput from './components/ChatInput'
import Sidebar from './components/Sidebar'
import EvalDashboard from './components/EvalDashboard'
import { useChat } from './hooks/useChat'
import './App.css'

export default function App() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [showEval, setShowEval] = useState(false)
  const { messages, isLoading, error, sendMessage } = useChat()

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo">⚡ Lumina</span>
        <div className="header-actions">
          <button className="header-btn" onClick={() => setShowSidebar(s => !s)}>
            {showSidebar ? 'Hide sidebar' : 'Notes & Memory'}
          </button>
          <button className="header-btn" onClick={() => setShowEval(true)}>
            Eval
          </button>
        </div>
      </header>

      <div className="app-body">
        <main className="chat-main">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>Ask me anything. I can search the web, save notes, and remember what matters.</p>
            </div>
          )}

          <div className="messages-list">
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {isLoading && (
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            )}
            {error && <div className="error-msg">{error}</div>}
          </div>

          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </main>

        {showSidebar && <Sidebar />}
      </div>

      {showEval && <EvalDashboard onClose={() => setShowEval(false)} />}
    </div>
  )
}