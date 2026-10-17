import { createClient } from '@supabase/supabase-js'
import { config } from '../core/config.js'

const supabaseUrl = config.supabaseUrl
const supabaseKey = config.supabaseAnonKey

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null

function warnMissingConfig(feature) {
  console.warn(`Supabase ${feature} called, but VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not configured.`)
}

// Save a response to the eval log
export async function logResponse({ sessionId, userMsg, assistantMsg, toolsUsed, latencyMs }) {
  if (!supabase) {
    warnMissingConfig('logResponse')
    return null
  }

  const { data, error } = await supabase
    .from('eval_logs')
    .insert({
      session_id: sessionId,
      user_message: userMsg,
      assistant_response: assistantMsg,
      tools_used: toolsUsed,
      latency_ms: latencyMs,
    })
    .select('id')
    .single()

  if (error) console.error('Log error:', error)
  return data?.id
}

// Save a thumbs up/down rating
export async function rateResponse(logId, rating) {
  if (!supabase || !logId) return
  await supabase
    .from('eval_logs')
    .update({ user_rating: rating })
    .eq('id', logId)
}

// Get eval stats for dashboard
export async function getEvalStats() {
  if (!supabase) return []
  const { data } = await supabase
    .from('eval_logs')
    .select('user_rating, latency_ms, tools_used, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return data || []
}

// Memory: get all stored facts
export async function getMemories() {
  if (!supabase) return []
  const { data } = await supabase
    .from('memories')
    .select('content, category, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  return data || []
}

// Memory: save new facts
export async function saveMemories(facts) {
  if (!supabase || !facts?.length) return
  await supabase.from('memories').insert(
    facts.map(f => ({ content: f, category: 'extracted' }))
  )
}

// Notes: save a note
export async function saveNote({ title, content }) {
  if (!supabase) {
    warnMissingConfig('saveNote')
    return null
  }
  const { data } = await supabase
    .from('notes')
    .insert({ title, content })
    .select('id')
    .single()
  return data?.id
}

// Notes: get all notes, optionally filtered
export async function getNotes(query) {
  if (!supabase) return []
  let req = supabase
    .from('notes')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (query) {
    req = req.ilike('content', `%${query}%`)
  }

  const { data } = await req
  return data || []
}