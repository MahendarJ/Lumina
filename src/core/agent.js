import { TOOL_DEFINITIONS, executeTool as defaultExecuteTool } from '../lib/tools.js'
import { callWithRetry } from '../lib/reliability.js'
import { parseCitations, detectConfidence } from '../lib/trust.js'
import { getMemories as defaultGetMemories } from '../lib/supabase.js'
import { config } from './config.js'

export class LuminaAgent {
  constructor(options = {}) {
    this.name = options.name || 'Lumina'
    this.model = options.model || config.groqModel || 'moonshotai/kimi-k2-instruct'
    this.groqUrl = options.groqUrl || config.groqUrl
    this.groqApiKey = options.groqApiKey || config.groqApiKey
    this.maxLoops = options.maxLoops !== undefined ? options.maxLoops : 5
    this.toolDefinitions = options.toolDefinitions || TOOL_DEFINITIONS
    this.executeToolFn = options.executeTool || defaultExecuteTool
    this.getMemoriesFn = options.getMemories || defaultGetMemories
    this.customLLMCaller = options.customLLMCaller || null
    this.listeners = {
      onStep: options.onStep || null,
      onToolCall: options.onToolCall || null,
      onToolResult: options.onToolResult || null,
    }
  }

  // Convert Anthropic-style tools to Groq/OpenAI-style tools
  convertToolsToGroqFormat(tools) {
    return tools.map((tool) => {
      if (tool.type === 'function') return tool
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema || {
            type: 'object',
            properties: {},
          },
        },
      }
    })
  }

  // Build the system prompt with injected memories
  async buildSystemPrompt(customMemories = null) {
    let memories
    if (customMemories !== null) {
      memories = customMemories
    } else {
      try {
        memories = await this.getMemoriesFn()
      } catch (err) {
        console.warn('Could not fetch memories for system prompt:', err.message)
        memories = []
      }
    }

    const memoryBlock = memories && memories.length
      ? `\n\nWhat you know about this user:\n${memories.map(m => `- ${m.content}`).join('\n')}`
      : ''

    return `You are Lumina, your autonomous AI partner.
You are direct, efficient, and focused on helping the user make progress on their goals.
You have access to web search and a notes tool — use them when needed, not by default.
When using information from a web search, cite your source as: [Source: title, url]
When you are uncertain about something, say so clearly. Prefix uncertain claims with "I think" or "I'm not certain, but".${memoryBlock}`
  }

  // Core execution caller
  async callLLM(messages, tools) {
    if (this.customLLMCaller) {
      return await this.customLLMCaller(messages, tools)
    }

    const makeAPICall = () =>
      fetch(this.groqUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.groqApiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_completion_tokens: 1000,
          temperature: 0.2,
          tool_choice: 'auto',
          tools: this.convertToolsToGroqFormat(tools),
          messages,
        }),
      }).then(async (r) => {
        const data = await r.json()
        if (!r.ok) {
          throw new Error(data?.error?.message || 'Groq API request failed')
        }
        return data
      })

    return await callWithRetry(makeAPICall)
  }

  // Main agent loop with rich trajectory recording
  async run(messages, options = {}) {
    const startTime = Date.now()
    const systemPrompt = options.systemPrompt || (await this.buildSystemPrompt(options.memories))
    const currentMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ]

    const trajectory = {
      sessionId: options.sessionId || `session_${Date.now()}`,
      startTime: new Date(startTime).toISOString(),
      prompt: messages[messages.length - 1]?.content || '',
      systemPrompt,
      steps: [],
      toolsUsed: [],
      totalLoops: 0,
      totalDurationMs: 0,
      status: 'in_progress',
      error: null,
    }

    let loopCount = 0
    let lastLLMResponse = null

    try {
      while (loopCount <= this.maxLoops) {
        loopCount++
        const stepStart = Date.now()

        const response = await this.callLLM(currentMessages, this.toolDefinitions)
        lastLLMResponse = response

        const choice = response.choices?.[0]
        const finishReason = choice?.finish_reason
        const assistantMessage = choice?.message || { role: 'assistant', content: '' }

        if (finishReason === 'tool_calls' && assistantMessage.tool_calls?.length) {
          // Record step
          const stepRecord = {
            loop: loopCount,
            type: 'tool_calls',
            assistantMessage,
            toolCalls: assistantMessage.tool_calls.map(tc => ({
              id: tc.id,
              name: tc.function.name,
              arguments: tc.function.arguments,
            })),
            toolResults: [],
            durationMs: Date.now() - stepStart,
          }

          currentMessages.push(assistantMessage)
          if (this.listeners.onStep) this.listeners.onStep(stepRecord)

          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name
            trajectory.toolsUsed.push(toolName)

            if (this.listeners.onToolCall) {
              this.listeners.onToolCall({ name: toolName, call: toolCall })
            }

            let toolInput = {}
            try {
              toolInput = JSON.parse(toolCall.function.arguments || '{}')
            } catch {
              toolInput = {}
            }

            let result
            let isError = false
            try {
              result = await this.executeToolFn(toolName, toolInput)
            } catch (err) {
              isError = true
              result = { error: err.message, is_error: true }
            }

            const toolResultMsg = {
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(result),
            }

            currentMessages.push(toolResultMsg)
            stepRecord.toolResults.push({
              toolName,
              toolCallId: toolCall.id,
              result,
              isError,
            })

            if (this.listeners.onToolResult) {
              this.listeners.onToolResult({ name: toolName, result, isError })
            }
          }

          trajectory.steps.push(stepRecord)

          if (loopCount >= this.maxLoops) {
            // Reached safety cap
            trajectory.steps.push({
              loop: loopCount,
              type: 'safety_cap_reached',
              message: `Maximum loops (${this.maxLoops}) reached. Terminating tool orchestration.`,
              durationMs: 0,
            })
            break
          }
        } else {
          // Final reply reached
          const replyText = assistantMessage.content || 'No response generated.'
          const { cleanText, citations } = parseCitations(replyText)
          const confidence = detectConfidence(cleanText)

          trajectory.steps.push({
            loop: loopCount,
            type: 'final_response',
            rawContent: replyText,
            cleanText,
            citations,
            confidence,
            durationMs: Date.now() - stepStart,
          })

          trajectory.status = 'completed'
          trajectory.totalLoops = loopCount
          trajectory.totalDurationMs = Date.now() - startTime
          trajectory.finalReply = cleanText
          trajectory.rawReply = replyText
          trajectory.citations = citations
          trajectory.confidence = confidence

          return {
            reply: replyText,
            cleanText,
            citations,
            confidence,
            toolsUsed: trajectory.toolsUsed,
            trajectory,
          }
        }
      }

      // If loop finished due to maxLoops without a final content message, make one last call or return fallback
      const fallbackReply = lastLLMResponse?.choices?.[0]?.message?.content ||
        'I completed the tool executions but reached the iteration limit.'
      const { cleanText, citations } = parseCitations(fallbackReply)
      const confidence = detectConfidence(cleanText)

      trajectory.status = 'limit_reached'
      trajectory.totalLoops = loopCount
      trajectory.totalDurationMs = Date.now() - startTime
      trajectory.finalReply = cleanText
      trajectory.rawReply = fallbackReply
      trajectory.citations = citations
      trajectory.confidence = confidence

      return {
        reply: fallbackReply,
        cleanText,
        citations,
        confidence,
        toolsUsed: trajectory.toolsUsed,
        trajectory,
      }
    } catch (error) {
      trajectory.status = 'failed'
      trajectory.error = error.message
      trajectory.totalDurationMs = Date.now() - startTime
      throw error
    }
  }
}
