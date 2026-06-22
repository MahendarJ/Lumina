import { useState, useEffect } from 'react'
import { getNotes, getMemories } from '../lib/supabase'

export default function Sidebar() {
  const [tab, setTab] = useState('notes')
  const [notes, setNotes] = useState([])
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [n, m] = await Promise.all([getNotes(), getMemories()])
      setNotes(n)
      setMemories(m)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${tab === 'notes' ? 'active' : ''}`}
          onClick={() => setTab('notes')}
        >
          Notes
        </button>
        <button
          className={`sidebar-tab ${tab === 'memory' ? 'active' : ''}`}
          onClick={() => setTab('memory')}
        >
          Memory
        </button>
      </div>

      {loading && <p className="sidebar-empty">Loading...</p>}

      {!loading && tab === 'notes' && (
        <div className="sidebar-list">
          {notes.length === 0 && (
            <p className="sidebar-empty">No notes yet. Ask Lumina to save something.</p>
          )}
          {notes.map(note => (
            <div key={note.id} className="sidebar-item">
              <strong>{note.title}</strong>
              <p>{note.content}</p>
              <span className="sidebar-date">
                {new Date(note.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'memory' && (
        <div className="sidebar-list">
          {memories.length === 0 && (
            <p className="sidebar-empty">No memories yet. Have a conversation first.</p>
          )}
          {memories.map((mem, i) => (
            <div key={i} className="sidebar-item">
              <p>{mem.content}</p>
              <span className="sidebar-date">
                {new Date(mem.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}