import { useState, useEffect } from 'react'
import { getEvalStats } from '../lib/supabase'

export default function EvalDashboard({ onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEvalStats().then(data => {
      setLogs(data)
      setLoading(false)
    })
  }, [])

  const rated = logs.filter(l => l.user_rating !== null)
  const thumbsUp = rated.filter(l => l.user_rating === 1).length
  const thumbsUpRate = rated.length ? Math.round((thumbsUp / rated.length) * 100) : null
  const avgLatency = logs.length
    ? Math.round(logs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / logs.length)
    : null
  const failures = logs.filter(l => l.user_rating === -1)

  return (
    <div className="eval-overlay">
      <div className="eval-panel">
        <div className="eval-header">
          <h2>Eval Dashboard</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {loading ? <p>Loading...</p> : (
          <>
            <div className="eval-stats">
              <div className="stat-card">
                <div className="stat-value">
                  {thumbsUpRate !== null ? `${thumbsUpRate}%` : '—'}
                </div>
                <div className="stat-label">Thumbs-up rate</div>
                <div className="stat-sub">{rated.length} rated responses</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">
                  {avgLatency ? `${(avgLatency / 1000).toFixed(1)}s` : '—'}
                </div>
                <div className="stat-label">Avg latency</div>
                <div className="stat-sub">{logs.length} total responses</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">{failures.length}</div>
                <div className="stat-label">Thumbs-down</div>
                <div className="stat-sub">responses to investigate</div>
              </div>
            </div>

            {failures.length > 0 && (
              <div className="eval-failures">
                <h3>Failed responses (investigate these)</h3>
                {failures.slice(0, 5).map((f, i) => (
                  <div key={i} className="failure-item">
                    <strong>Q: </strong>{f.user_message}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}