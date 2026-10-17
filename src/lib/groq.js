import { LuminaAgent } from '../core/agent.js'
import { TOOL_DEFINITIONS } from './tools.js'

// Convert Anthropic-style tools to Groq/OpenAI-style tools
export function convertToolsToGroqFormat(tools) {
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

// Main function — uses LuminaAgent under the hood for clean orchestration & trajectory
export async function runOrchestrationLoop(messages, systemPrompt) {
  const agent = new LuminaAgent({
    toolDefinitions: TOOL_DEFINITIONS,
  })

  const result = await agent.run(messages, { systemPrompt })

  return {
    reply: result.reply,
    cleanText: result.cleanText,
    citations: result.citations,
    confidence: result.confidence,
    toolsUsed: result.toolsUsed,
    trajectory: result.trajectory,
  }
}