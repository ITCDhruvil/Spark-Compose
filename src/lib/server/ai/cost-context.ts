import { AsyncLocalStorage } from 'async_hooks'
import type { AiFeatureId } from './cost-types'

export interface AiCostContext {
  feature: AiFeatureId | string
  userId: string
}

export const aiCostContext = new AsyncLocalStorage<AiCostContext>()

export function getAiCostContext(): AiCostContext {
  return aiCostContext.getStore() ?? { feature: 'unknown', userId: 'local-user' }
}

export function runWithAiCost<T>(ctx: AiCostContext, fn: () => T): T {
  return aiCostContext.run(ctx, fn)
}

export function costContextFromRequest(req: Request, fallbackFeature: string): AiCostContext {
  return {
    feature: req.headers.get('x-ai-feature')?.trim() || fallbackFeature,
    userId: req.headers.get('x-user-id')?.trim() || 'local-user',
  }
}
