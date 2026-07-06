import { getAiCostContext } from './cost-context'
import { recordAiUsage } from './cost-store'
import { estimateTokens } from './pricing'

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content?: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ChatToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

interface OpenAiUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

function requireApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Add it to .env.local and restart the dev server.')
  }
  return apiKey
}

function defaultModel(model?: string): string {
  return model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
}

export function autocompleteModel(model?: string): string {
  return model ?? process.env.OPENAI_AUTOCOMPLETE_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
}

function messagesText(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      if (typeof m.content === 'string') return m.content
      return ''
    })
    .join('\n')
}

export interface AiCostOpts {
  feature?: string
  userId?: string
  tags?: string[]
}

function resolveCostMeta(cost?: AiCostOpts) {
  const ctx = getAiCostContext()
  return {
    feature: cost?.feature ?? ctx.feature,
    userId: cost?.userId ?? ctx.userId,
    tags: cost?.tags ?? [],
  }
}

function logUsage(opts: {
  model: string
  promptTokens: number
  completionTokens: number
  estimated?: boolean
  cost?: AiCostOpts
}) {
  try {
    const meta = resolveCostMeta(opts.cost)
    recordAiUsage({
      feature: meta.feature,
      userId: meta.userId,
      model: opts.model,
      promptTokens: opts.promptTokens,
      completionTokens: opts.completionTokens,
      estimated: opts.estimated,
      tags: meta.tags,
    })
  } catch {
    // cost logging must never break AI responses
  }
}

async function openaiFetch(body: Record<string, unknown>): Promise<Response> {
  const apiKey = requireApiKey()
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

async function streamWithUsage(
  body: Record<string, unknown>,
  onToken: (delta: string) => void,
  messages: ChatMessage[],
  cost?: AiCostOpts,
): Promise<void> {
  const model = String(body.model)
  const res = await openaiFetch({
    ...body,
    stream: true,
    stream_options: { include_usage: true },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `OpenAI API error ${res.status}`)
  }
  if (!res.body) throw new Error('No response body from OpenAI')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let output = ''
  let usage: OpenAiUsage | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[]
          usage?: OpenAiUsage
        }
        if (parsed.usage) usage = parsed.usage
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) {
          output += delta
          onToken(delta)
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  if (usage?.prompt_tokens != null && usage?.completion_tokens != null) {
    logUsage({
      model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      cost,
    })
  } else {
    logUsage({
      model,
      promptTokens: estimateTokens(messagesText(messages)),
      completionTokens: estimateTokens(output),
      estimated: true,
      cost,
    })
  }
}

function logFromResponse(
  model: string,
  messages: ChatMessage[],
  content: string,
  usage?: OpenAiUsage,
  cost?: AiCostOpts,
) {
  if (usage?.prompt_tokens != null && usage?.completion_tokens != null) {
    logUsage({
      model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      cost,
    })
  } else {
    logUsage({
      model,
      promptTokens: estimateTokens(messagesText(messages)),
      completionTokens: estimateTokens(content),
      estimated: true,
      cost,
    })
  }
}

type ChatOpts = { model?: string; maxTokens?: number } & AiCostOpts
type StreamOpts = ChatOpts & { temperature?: number; stop?: string[] }

export async function streamChat(
  messages: ChatMessage[],
  onToken: (delta: string) => void,
  opts?: StreamOpts,
): Promise<void> {
  const body: Record<string, unknown> = {
    model: defaultModel(opts?.model),
    messages,
    max_tokens: opts?.maxTokens ?? 1024,
  }
  if (opts?.temperature !== undefined) body.temperature = opts.temperature
  if (opts?.stop?.length) body.stop = opts.stop
  await streamWithUsage(body, onToken, messages, opts)
}

export async function chatJSON<T>(
  messages: ChatMessage[],
  opts?: ChatOpts,
): Promise<T> {
  const model = defaultModel(opts?.model)
  const res = await openaiFetch({
    model,
    messages,
    response_format: { type: 'json_object' },
    max_tokens: opts?.maxTokens ?? 2048,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `OpenAI API error ${res.status}`)
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
    usage?: OpenAiUsage
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from model')
  logFromResponse(model, messages, content, data.usage, opts)
  return JSON.parse(content) as T
}

/** Vision-capable JSON chat — model must support image_url (e.g. gpt-4o-mini). */
export async function chatVisionJSON<T>(
  text: string,
  imageUrl: string,
  opts?: ChatOpts,
): Promise<T> {
  const model = defaultModel(opts?.model)
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: text,
    },
  ]
  const res = await openaiFetch({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: opts?.maxTokens ?? 400,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `OpenAI API error ${res.status}`)
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
    usage?: OpenAiUsage
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from model')
  logFromResponse(model, messages, content, data.usage, opts)
  return JSON.parse(content) as T
}

export async function chatText(
  messages: ChatMessage[],
  opts?: ChatOpts,
): Promise<string> {
  const model = defaultModel(opts?.model)
  const res = await openaiFetch({
    model,
    messages,
    max_tokens: opts?.maxTokens ?? 4096,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `OpenAI API error ${res.status}`)
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
    usage?: OpenAiUsage
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from model')
  logFromResponse(model, messages, content, data.usage, opts)
  return content
}

export async function chatWithTools(
  messages: ChatMessage[],
  tools: ChatToolDef[],
  opts?: ChatOpts & { toolChoice?: 'auto' | 'required' | { type: 'function'; function: { name: string } } },
): Promise<{ content: string | null; tool_calls: ToolCall[]; assistantMessage: ChatMessage }> {
  const model = defaultModel(opts?.model)
  const res = await openaiFetch({
    model,
    messages,
    tools,
    tool_choice: opts?.toolChoice ?? 'auto',
    max_tokens: opts?.maxTokens ?? 2048,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `OpenAI API error ${res.status}`)
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[]
    usage?: OpenAiUsage
  }
  const message = data.choices?.[0]?.message
  if (!message) throw new Error('Empty response from model')
  const tool_calls = message.tool_calls ?? []
  const assistantMessage: ChatMessage = {
    role: 'assistant',
    content: message.content ?? null,
    ...(tool_calls.length ? { tool_calls } : {}),
  }
  logFromResponse(model, messages, message.content ?? JSON.stringify(tool_calls), data.usage, opts)
  return { content: message.content ?? null, tool_calls, assistantMessage }
}

export async function streamAutocomplete(
  messages: ChatMessage[],
  onToken: (delta: string) => void,
  opts?: StreamOpts,
): Promise<void> {
  const body: Record<string, unknown> = {
    model: autocompleteModel(opts?.model),
    messages,
    max_tokens: opts?.maxTokens ?? 24,
    temperature: 0.2,
  }
  if (opts?.stop?.length) body.stop = opts.stop
  await streamWithUsage(body, onToken, messages, opts)
}

