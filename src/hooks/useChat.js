import { useState, useCallback, useRef } from 'react'
import { runOrchestrationLoop } from '../lib/groq'
import { buildSystemPrompt, extractAndSaveMemories } from '../lib/memory'
import { logResponse } from '../lib/supabase'
import { trimContext, getUserFriendlyError } from '../lib/reliability'
import { parseCitations, detectConfidence } from '../lib/trust'

const SESSION_ID = `session_${Date.now()}`

export function useChat() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  // useRef keeps conversation history without causing re-renders
  const historyRef = useRef([])
  const isSendingRef = useRef(false)

  const sendMessage = useCallback(async (userText) => {
    if (isSendingRef.current) return
    isSendingRef.current = true

    setError(null)
    setIsLoading(true)

    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: 'user', text: userText }])

    // Build history for API call
    const userMsg = { role: 'user', content: userText }
    const newHistory = trimContext([...historyRef.current, userMsg])

    const startTime = Date.now()

    try {
      const systemPrompt = await buildSystemPrompt()
      const { reply, toolsUsed } = await runOrchestrationLoop(newHistory, systemPrompt)

      const latencyMs = Date.now() - startTime
      const { cleanText, citations } = parseCitations(reply)
      const confidence = detectConfidence(cleanText)

      // Update history ref for next message
      historyRef.current = [
        ...newHistory,
        { role: 'assistant', content: reply },
      ]

      // Log to Supabase for evaluation
      const logId = await logResponse({
        sessionId: SESSION_ID,
        userMsg: userText,
        assistantMsg: reply,
        toolsUsed,
        latencyMs,
      })

      // Add assistant message to UI
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: cleanText,
        citations,
        confidence,
        toolsUsed,
        logId,
        latencyMs,
      }])

      // Extract memories silently in background — does not block user
      // Optimization: Only run every 4 messages (2 conversation turns) to save API tokens and avoid rate limits
      if (historyRef.current.length % 4 === 0) {
        extractAndSaveMemories(historyRef.current).catch(console.error)
      }

    } catch (err) {
      setError(getUserFriendlyError(err))
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
      isSendingRef.current = false
    }
  }, [])

  return { messages, isLoading, error, sendMessage, sessionId: SESSION_ID }
}