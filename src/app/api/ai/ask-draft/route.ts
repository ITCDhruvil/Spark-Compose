import { NextResponse } from 'next/server'
import type { ChatMessage, ChatToolDef, ToolCall } from '@/lib/server/ai/openai-stream'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatWithTools } from '@/lib/server/ai/openai-stream'
import { parseJsonBody } from '@/lib/server/ai/parse-json-body'
import type { AskDraftRequest, AskDraftResponse } from '@/lib/api/ai-types'
import {
  buildAskDraftSystemPrompt,
  isContentType,
  parsePlan,
  parseQuestions,
  parseReplyMessage,
} from '@/lib/server/ai/ask-draft-helpers'

const TOOLS: ChatToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'replyToUser',
      description:
        'Send 1–3 short sentences as a real colleague: react to what they just said, then lead into the next question. Sound human and specific to their situation. Never lecture about writing craft. Never write the draft body. Call together with askUserQuestion.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Human, situational reply (e.g. "Oh that sounds serious — what happened with the iron rods?")',
          },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'askUserQuestion',
      description:
        'Ask exactly ONE question grounded in their last answer (not a generic template). Provide 3–5 concrete option chips that fit THEIR situation; last option must be Other. Set allowMultiple true when the user may pick several options at once (key points, themes, audiences to include). False for exclusive choices (one audience, one length).',
      parameters: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            minItems: 1,
            maxItems: 1,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question: { type: 'string' },
                options: {
                  type: 'array',
                  minItems: 3,
                  maxItems: 6,
                  items: { type: 'string' },
                  description: 'Concrete choices tied to their story; last option must be Other',
                },
                allowMultiple: {
                  type: 'boolean',
                  description:
                    'True if the user can select multiple options before continuing (e.g. key points). False if only one answer',
                },
              },
              required: ['id', 'question', 'options'],
            },
          },
        },
        required: ['questions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'askOptionalQuestions',
      description:
        'Ask exactly ONE optional / skippable question per call (wizard style — never batch two questions). Typical sequence: draft length, then site photos. Always include "Other" as the last option. Call again later for the next optional topic. Use allowMultiple only when several options can apply together.',
      parameters: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            minItems: 1,
            maxItems: 1,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question: { type: 'string' },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                },
                allowMultiple: {
                  type: 'boolean',
                  description: 'True if multiple options may be selected',
                },
              },
              required: ['id', 'question', 'options'],
            },
          },
        },
        required: ['questions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'submitDraftPlan',
      description:
        'Submit the draft plan when enough interview info is known. Include a real-time outline (3–6 sections) tailored to THIS conversation — not a fixed template. Do not write the article body.',
      parameters: {
        type: 'object',
        properties: {
          contentType: {
            type: 'string',
            enum: ['article', 'blog_post', 'case_study', 'experience_share', 'technical_guide'],
          },
          audience: { type: 'string' },
          topic: { type: 'string' },
          angle: { type: 'string' },
          mustInclude: { type: 'string' },
          length: { type: 'string', enum: ['short', 'medium', 'long'] },
          includeSampleImage: {
            type: 'boolean',
            description: 'True if the user wants site photos included',
          },
          photoPlacementHint: { type: 'string' },
          whys: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Filled playbook WHY slots keyed by slot key',
          },
          briefSummary: {
            type: 'string',
            description: '2–4 sentence human-readable brief of what will be drafted',
          },
          draftName: {
            type: 'string',
            description: 'Working name for this draft (short)',
          },
          outline: {
            type: 'array',
            minItems: 3,
            maxItems: 6,
            description: 'Section outline proposed from this conversation',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                heading: { type: 'string', description: 'H2 heading the user will write under' },
                intent: { type: 'string', description: 'What this section should accomplish' },
              },
              required: ['id', 'heading'],
            },
          },
        },
        required: ['contentType', 'audience', 'topic', 'length', 'includeSampleImage', 'draftName', 'outline'],
      },
    },
  },
]

function toolArgs(call: ToolCall): unknown {
  try {
    return JSON.parse(call.function.arguments || '{}')
  } catch {
    return {}
  }
}

function extractAssistantMessage(tool_calls: ToolCall[]): string | undefined {
  const reply = tool_calls.find((c) => c.function.name === 'replyToUser')
  if (!reply) return undefined
  const msg = parseReplyMessage(toolArgs(reply))
  return msg || undefined
}

function ackTools(messages: ChatMessage[], tool_calls: ToolCall[], exceptId?: string): ChatMessage[] {
  const next = [...messages]
  for (const call of tool_calls) {
    if (exceptId && call.id === exceptId) continue
    if (call.function.name === 'replyToUser') {
      next.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify({ ok: true, delivered: true }),
      })
    } else {
      next.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify({ ok: true, deferred: true }),
      })
    }
  }
  return next
}

export async function POST(req: Request) {
  const cost = costOpts(req, 'draft')
  const parsed = await parseJsonBody<AskDraftRequest>(req)
  if (!parsed.ok) return parsed.response

  const { prompt, messages: priorMessages, toolResults, contentType: pinnedType } = parsed.data
  if (!prompt?.trim() && !priorMessages?.length) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  const contentType = isContentType(pinnedType) ? pinnedType : undefined

  try {
    let messages: ChatMessage[] = priorMessages?.length
      ? (priorMessages as ChatMessage[])
      : [
          { role: 'system', content: buildAskDraftSystemPrompt(contentType) },
          {
            role: 'user',
            content: contentType
              ? `[contentType=${contentType}]\n${prompt.trim() || 'Help me draft this.'}`
              : prompt.trim(),
          },
        ]

    if (toolResults?.length) {
      for (const result of toolResults) {
        messages = [
          ...messages,
          { role: 'tool', tool_call_id: result.toolCallId, content: result.output },
        ]
      }
    }

    for (let round = 0; round < 4; round++) {
      const { tool_calls, assistantMessage } = await chatWithTools(messages, TOOLS, {
        toolChoice: 'required',
        maxTokens: 1024,
        ...cost,
      })

      messages = [...messages, assistantMessage]

      if (!tool_calls.length) {
        return NextResponse.json({ error: 'Model did not use tools' }, { status: 502 })
      }

      const assistantMsg = extractAssistantMessage(tool_calls)
      const requiredCall = tool_calls.find((c) => c.function.name === 'askUserQuestion')
      const optionalCall = tool_calls.find((c) => c.function.name === 'askOptionalQuestions')
      const planCall = tool_calls.find((c) => c.function.name === 'submitDraftPlan')

      if (requiredCall) {
        const questions = parseQuestions(toolArgs(requiredCall)).slice(0, 1)
        if (questions.length > 0) {
          const response: AskDraftResponse = {
            type: 'questions',
            kind: 'required',
            questions,
            ...(assistantMsg ? { assistantMessage: assistantMsg } : {}),
            messages,
            pendingToolCallIds: tool_calls.map((c) => c.id),
            pendingToolNames: tool_calls.map((c) => c.function.name),
          }
          return NextResponse.json(response)
        }
      }

      if (optionalCall) {
        const questions = parseQuestions(toolArgs(optionalCall))
        const one = (questions.length > 0
          ? questions
          : [{
              id: 'include_image',
              question: 'Include site photos in the draft?',
              options: ['Yes, I will attach photos', 'No image', 'Other'],
            }]).slice(0, 1)
        const response: AskDraftResponse = {
          type: 'questions',
          kind: 'optional',
          questions: one,
          ...(assistantMsg ? { assistantMessage: assistantMsg } : {}),
          messages,
          pendingToolCallIds: tool_calls.map((c) => c.id),
          pendingToolNames: tool_calls.map((c) => c.function.name),
        }
        return NextResponse.json(response)
      }

      if (planCall) {
        const plan = parsePlan(toolArgs(planCall), contentType)
        if (!plan) {
          messages = [
            ...messages,
            {
              role: 'tool',
              tool_call_id: planCall.id,
              content: JSON.stringify({ error: 'audience and topic are required' }),
            },
            ...tool_calls
              .filter((c) => c.id !== planCall.id)
              .map((c) => ({
                role: 'tool' as const,
                tool_call_id: c.id,
                content: JSON.stringify({
                  ok: true,
                  deferred: c.function.name !== 'replyToUser',
                  delivered: c.function.name === 'replyToUser',
                }),
              })),
          ]
          continue
        }
        messages = ackTools(messages, tool_calls, planCall.id)
        messages.push({
          role: 'tool',
          tool_call_id: planCall.id,
          content: JSON.stringify({ ok: true, plan }),
        })
        const response: AskDraftResponse = {
          type: 'ready',
          plan,
          ...(assistantMsg ? { assistantMessage: assistantMsg } : {}),
          messages,
        }
        return NextResponse.json(response)
      }

      // replyToUser alone — acknowledge and continue so model asks next
      const onlyReply = tool_calls.every((c) => c.function.name === 'replyToUser')
      if (onlyReply && assistantMsg) {
        messages = ackTools(messages, tool_calls)
        continue
      }

      for (const call of tool_calls) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: `Unknown tool ${call.function.name}` }),
        })
      }
    }

    return NextResponse.json({ error: 'Could not complete ask flow' }, { status: 502 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ask draft failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
