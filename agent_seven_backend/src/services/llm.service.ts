import OpenAI from 'openai';

// Lazy initialization – avoids crashing at import time if key is not yet set
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Anthropic-style tool definition (used internally by agent.service.ts)
interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

// Anthropic-style message param (used internally by agent.service.ts)
type AnthropicMessageParam = {
  role: 'user' | 'assistant';
  content: string | any[];
};

/** Convert Anthropic-style tool definitions to OpenAI function-calling format */
function toOpenAITools(tools: AnthropicTool[]): OpenAI.ChatCompletionTool[] {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

/** Convert Anthropic-style messages to OpenAI chat messages.
 *  Handles plain string content and Anthropic tool_result arrays. */
function toOpenAIMessages(messages: AnthropicMessageParam[]): OpenAI.ChatCompletionMessageParam[] {
  const result: OpenAI.ChatCompletionMessageParam[] = [];

  for (const m of messages) {
    if (typeof m.content === 'string') {
      result.push({ role: m.role, content: m.content });
    } else if (Array.isArray(m.content)) {
      // Handle assistant messages that contain tool_use blocks
      if (m.role === 'assistant') {
        const textParts = m.content.filter((c: any) => c.type === 'text');
        const toolUseParts = m.content.filter((c: any) => c.type === 'tool_use');

        const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: textParts.map((t: any) => t.text).join('\n') || null,
          tool_calls: toolUseParts.length > 0
            ? toolUseParts.map((tc: any) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: JSON.stringify(tc.input) },
              }))
            : undefined,
        };
        result.push(assistantMsg);
      } else {
        // user role with array content — could be tool_result blocks
        for (const block of m.content) {
          if (block.type === 'tool_result') {
            result.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
            });
          } else if (block.type === 'text') {
            result.push({ role: 'user', content: block.text });
          }
        }
      }
    }
  }

  return result;
}

/** Shape returned by reasonWithSonnet / streamWithSonnet, compatible with the agent loop */
export interface LLMResponse {
  content: string | null;
  tool_calls: Array<{
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, any>;
  }>;
  usage: { input_tokens: number; output_tokens: number };
}

export const llmService = {
  /**
   * Quick classification using gpt-4o-mini (replaces claude-haiku).
   */
  async classifyWithHaiku(prompt: string): Promise<string> {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0].message.content ?? '';
  },

  /**
   * Reasoning call using gpt-4o (replaces claude-sonnet).
   * Returns a compatible shape so the agent loop needs minimal changes.
   */
  async reasonWithSonnet(
    messages: AnthropicMessageParam[],
    tools: AnthropicTool[],
    systemPrompt: string
  ): Promise<LLMResponse> {
    const openai = getOpenAI();

    const openAIMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...toOpenAIMessages(messages),
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: openAIMessages,
      tools: tools.length > 0 ? toOpenAITools(tools) : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
    });

    const choice = response.choices[0].message;

    return {
      content: choice.content ?? null,
      tool_calls: (choice.tool_calls ?? []).map((tc: any) => ({
        type: 'tool_use' as const,
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments),
      })),
      usage: {
        input_tokens: response.usage?.prompt_tokens ?? 0,
        output_tokens: response.usage?.completion_tokens ?? 0,
      },
    };
  },

  /**
   * Streaming call using gpt-4o (replaces claude-sonnet streaming).
   * Calls onChunk for each text delta, then returns the assembled response in the
   * same compatible shape as reasonWithSonnet.
   */
  async streamWithSonnet(
    messages: AnthropicMessageParam[],
    tools: AnthropicTool[],
    systemPrompt: string,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse> {
    const openai = getOpenAI();

    const openAIMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...toOpenAIMessages(messages),
    ];

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: openAIMessages,
      tools: tools.length > 0 ? toOpenAITools(tools) : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      stream: true,
      stream_options: { include_usage: true },
    });

    let fullContent = '';
    let usage = { input_tokens: 0, output_tokens: 0 };

    // Accumulate tool call fragments
    const toolCallMap: Record<number, { id: string; name: string; arguments: string }> = {};

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // Text delta
      if (delta?.content) {
        fullContent += delta.content;
        onChunk(delta.content);
      }

      // Tool call deltas
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCallMap[tc.index]) {
            toolCallMap[tc.index] = { id: tc.id ?? '', name: tc.function?.name ?? '', arguments: '' };
          }
          if (tc.id) toolCallMap[tc.index].id = tc.id;
          if (tc.function?.name) toolCallMap[tc.index].name = tc.function.name;
          if (tc.function?.arguments) toolCallMap[tc.index].arguments += tc.function.arguments;
        }
      }

      // Usage (comes in final chunk when stream_options.include_usage is set)
      if (chunk.usage) {
        usage = {
          input_tokens: chunk.usage.prompt_tokens,
          output_tokens: chunk.usage.completion_tokens,
        };
      }
    }

    const toolCalls = Object.values(toolCallMap).map(tc => ({
      type: 'tool_use' as const,
      id: tc.id,
      name: tc.name,
      input: tc.arguments ? JSON.parse(tc.arguments) : {},
    }));

    return {
      content: fullContent || null,
      tool_calls: toolCalls,
      usage,
    };
  },
};
