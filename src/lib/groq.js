import { TOOL_DEFINITIONS, executeTool } from './tools'
import { callWithRetry } from './reliability'

const GROQ_MODEL = 'moonshotai/kimi-k2-instruct'

// Convert Anthropic-style tools to Groq/OpenAI-style tools
function convertToolsToGroqFormat(tools) {
  return tools.map((tool) => {
    // If already in OpenAI/Groq format, keep it
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

// Main function — call Groq, handle tool use loop, return final reply
export async function runOrchestrationLoop(messages, systemPrompt) {
  let currentMessages = [...messages]
  const toolsUsed = []

  const groqTools = convertToolsToGroqFormat(TOOL_DEFINITIONS)

  const makeAPICall = () =>
    fetch(import.meta.env.VITE_API_GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_GROQ_MODEL,
        max_completion_tokens: 1000,
        temperature: 0.2,
        tool_choice: 'auto',
        tools: groqTools,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...currentMessages,
        ],
      }),
    }).then(async (r) => {
      const data = await r.json()

      if (!r.ok) {
        throw new Error(data?.error?.message || 'Groq API request failed')
      }

      return data
    })

  let response = await callWithRetry(makeAPICall)

  let safetyLimit = 0

  while (
    response.choices?.[0]?.finish_reason === 'tool_calls' &&
    safetyLimit < 5
  ) {
    safetyLimit++

    const assistantMessage = response.choices[0].message
    const toolCalls = assistantMessage.tool_calls || []

    // Add Groq assistant tool-call message back to conversation
    currentMessages.push(assistantMessage)

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name
      toolsUsed.push(toolName)

      let toolInput = {}

      try {
        toolInput = JSON.parse(toolCall.function.arguments || '{}')
      } catch (error) {
        toolInput = {}
      }

      try {
        const result = await executeTool(toolName, toolInput)

        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(result),
        })
      } catch (error) {
        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify({
            error: error.message,
            is_error: true,
          }),
        })
      }
    }

    response = await callWithRetry(makeAPICall)
  }

  const reply =
    response.choices?.[0]?.message?.content || 'No response generated.'

  return { reply, toolsUsed }
}