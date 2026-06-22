import dotenv from 'dotenv';
dotenv.config();

const VITE_API_GROQ_URL = process.env.VITE_API_GROQ_URL;
const VITE_GROQ_API_KEY = process.env.VITE_GROQ_API_KEY;
const VITE_GROQ_MODEL = process.env.VITE_GROQ_MODEL;

const groqTools = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' }
        },
        required: ['query']
      }
    }
  }
];

async function test() {
  const currentMessages = [
    { role: 'user', content: 'what is the top 3 movies released in Netflix last week' }
  ];

  const res1 = await fetch(VITE_API_GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VITE_GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: VITE_GROQ_MODEL,
      max_tokens: 1000,
      temperature: 0.2,
      tool_choice: 'auto',
      tools: groqTools,
      messages: [
        { role: 'system', content: 'You are an AI' },
        ...currentMessages
      ]
    })
  });
  
  const data1 = await res1.json();
  console.log("FIRST RESP:", JSON.stringify(data1, null, 2));

  if (data1.choices && data1.choices[0].finish_reason === 'tool_calls') {
    const ast = data1.choices[0].message;
    currentMessages.push(ast);

    for (const tc of ast.tool_calls) {
      currentMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        name: tc.function.name,
        content: JSON.stringify({ result: "1. Movie A, 2. Movie B, 3. Movie C" })
      });
    }

    console.log("SENDING SECOND REQUEST WITH MESSAGES:", JSON.stringify(currentMessages, null, 2));

    const res2 = await fetch(VITE_API_GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: VITE_GROQ_MODEL,
        max_tokens: 1000,
        temperature: 0.2,
        tool_choice: 'auto',
        tools: groqTools,
        messages: [
          { role: 'system', content: 'You are an AI' },
          ...currentMessages
        ]
      })
    });
    
    const data2 = await res2.json();
    console.log("SECOND RESP:", JSON.stringify(data2, null, 2));
  }
}

test().catch(console.error);
