// Unified environment configuration helper
// Works seamlessly in both browser (Vite: import.meta.env) and Node.js (process.env)

export function getEnv(key, fallback = '') {
  // Check process.env (Node.js runtime / CLI / Harness)
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key]
  }

  // Check import.meta.env (Vite client-side bundle)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
      return import.meta.env[key]
    }
  } catch {
    // import.meta may throw syntax errors in older environments
  }

  return fallback
}

export const config = {
  get groqUrl() {
    return getEnv('VITE_API_GROQ_URL', 'https://api.groq.com/openai/v1/chat/completions')
  },
  get groqApiKey() {
    return getEnv('VITE_GROQ_API_KEY', '')
  },
  get groqModel() {
    return getEnv('VITE_GROQ_MODEL', 'moonshotai/kimi-k2-instruct')
  },
  get supabaseUrl() {
    return getEnv('VITE_SUPABASE_URL', '')
  },
  get supabaseAnonKey() {
    return getEnv('VITE_SUPABASE_ANON_KEY', '')
  },
  get tavilyApiKey() {
    return getEnv('VITE_TAVILY_API_KEY', '')
  },
}
