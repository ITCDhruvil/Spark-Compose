/** OpenAI list prices (USD per 1M tokens). Update when models change. */
export interface ModelPricing {
  id: string
  label: string
  inputPer1M: number
  outputPer1M: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    inputPer1M: 0.15,
    outputPer1M: 0.6,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    label: 'GPT-4o',
    inputPer1M: 2.5,
    outputPer1M: 10,
  },
  'gpt-4.1-mini': {
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 mini',
    inputPer1M: 0.4,
    outputPer1M: 1.6,
  },
  'gpt-4.1': {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    inputPer1M: 2,
    outputPer1M: 8,
  },
}

export const DEFAULT_MODEL_ID = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

export function getModelPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? {
    id: model,
    label: model,
    inputPer1M: MODEL_PRICING['gpt-4o-mini'].inputPer1M,
    outputPer1M: MODEL_PRICING['gpt-4o-mini'].outputPer1M,
  }
}

export function calcTokenCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): {
  inputCostUsd: number
  outputCostUsd: number
  totalCostUsd: number
} {
  const p = getModelPricing(model)
  const inputCostUsd = (promptTokens / 1_000_000) * p.inputPer1M
  const outputCostUsd = (completionTokens / 1_000_000) * p.outputPer1M
  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd,
  }
}

/** Rough token estimate when the API does not return usage. */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}
