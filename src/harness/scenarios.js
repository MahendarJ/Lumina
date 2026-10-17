// Benchmark scenarios catalog for the Lumina Agent Evaluation Harness

export const BENCHMARK_SCENARIOS = [
  {
    id: 'BM-01-TOOL-SEARCH',
    category: 'tool_routing',
    name: 'Web Search Routing',
    description: 'Verifies the agent accurately selects web_search for fresh/current external facts',
    messages: [
      {
        role: 'user',
        content: 'What is the latest quantum computing breakthrough in 2026?',
      },
    ],
    initialMemories: [],
    initialNotes: [],
    expectations: {
      expectedTools: ['web_search'],
      prohibitedTools: ['save_note', 'get_notes'],
      maxLoops: 3,
      requireCitation: true,
      contentKeywords: ['quantum', 'qubit'],
    },
  },
  {
    id: 'BM-02-TOOL-SAVE-NOTE',
    category: 'tool_routing',
    name: 'Save Note Tool Routing',
    description: 'Verifies the agent accurately invokes save_note when user asks to remember or save information',
    messages: [
      {
        role: 'user',
        content: 'Please remember this: my office security alarm code is 9942.',
      },
    ],
    initialMemories: [],
    initialNotes: [],
    expectations: {
      expectedTools: ['save_note'],
      prohibitedTools: ['web_search'],
      maxLoops: 2,
      contentKeywords: ['saved', 'note'],
    },
  },
  {
    id: 'BM-03-TOOL-GET-NOTES',
    category: 'tool_routing',
    name: 'Retrieve Notes Tool Routing',
    description: 'Verifies the agent invokes get_notes when asked to retrieve saved notes',
    messages: [
      {
        role: 'user',
        content: 'What are my notes from yesterday?',
      },
    ],
    initialMemories: [],
    initialNotes: [
      {
        title: 'Project Roadmap',
        content: 'Deploy Lumina Agent Harness by end of week.',
      },
    ],
    expectations: {
      expectedTools: ['get_notes'],
      prohibitedTools: ['web_search'],
      maxLoops: 2,
      contentKeywords: ['notes', 'roadmap'],
    },
  },
  {
    id: 'BM-04-NO-TOOL',
    category: 'tool_routing',
    name: 'Zero-Tool Direct Reasoning',
    description: 'Verifies the agent does not wastefully call tools for simple arithmetic or conversational queries',
    messages: [
      {
        role: 'user',
        content: 'What is 2 + 2?',
      },
    ],
    initialMemories: [],
    initialNotes: [],
    expectations: {
      expectedTools: [],
      prohibitedTools: ['web_search', 'save_note', 'get_notes'],
      maxLoops: 1,
      contentKeywords: ['4'],
    },
  },
  {
    id: 'BM-05-CITATION',
    category: 'grounding_citation',
    name: 'Citation Formatting and Verification',
    description: 'Verifies that web search results yield properly formatted [Source: title, url] citations in output',
    messages: [
      {
        role: 'user',
        content: 'Search and tell me what the latest quantum computing breakthrough is.',
      },
    ],
    initialMemories: [],
    initialNotes: [],
    expectations: {
      expectedTools: ['web_search'],
      requireCitation: true,
      minCitationsCount: 1,
      requireValidUrls: true,
      maxLoops: 3,
    },
  },
  {
    id: 'BM-06-MEMORY-RECALL',
    category: 'memory_injection',
    name: 'Long-term Memory Injection & Recall',
    description: 'Verifies the agent injects facts from the memory store into its system prompt and utilizes them in answers',
    messages: [
      {
        role: 'user',
        content: 'Can you recommend a project for me to build this weekend?',
      },
    ],
    initialMemories: [
      { content: 'User is learning Rust and systems programming', category: 'extracted' },
    ],
    initialNotes: [],
    expectations: {
      expectedTools: [],
      contentKeywords: ['rust'],
      maxLoops: 1,
    },
  },
  {
    id: 'BM-07-TOOL-FAILURE-GRACEFUL',
    category: 'guardrails_safety',
    name: 'Tool Failure Graceful Recovery',
    description: 'Verifies the agent catches tool exceptions and handles them gracefully without crashing the session',
    messages: [
      {
        role: 'user',
        content: 'Search the web for latest quantum computing breakthrough in 2026',
      },
    ],
    initialMemories: [],
    initialNotes: [],
    simulatedFailure: {
      toolName: 'web_search',
      errorMessage: 'Network timeout after 8000ms: Tavily Gateway Unreachable',
    },
    expectations: {
      expectedTools: ['web_search'],
      expectErrorHandled: true,
      maxLoops: 3,
    },
  },
  {
    id: 'BM-08-MAX-LOOPS-CAP',
    category: 'guardrails_safety',
    name: 'Runaway Loop Safety Cap Enforcement',
    description: 'Verifies the agent halts at maximum allowed loops (5) when an infinite tool call loop is triggered',
    messages: [
      {
        role: 'user',
        content: 'Search news endlessly in a loop',
      },
    ],
    initialMemories: [],
    initialNotes: [],
    forceInfiniteToolCalls: true,
    expectations: {
      maxLoops: 5,
      expectSafetyCapReached: true,
    },
  },
]
