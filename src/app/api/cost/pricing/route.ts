import { NextResponse } from 'next/server'
import { DEFAULT_MODEL_ID, MODEL_PRICING } from '@/lib/server/ai/pricing'
import { AI_FEATURES } from '@/lib/server/ai/cost-types'

export async function GET() {
  return NextResponse.json({
    defaultModel: DEFAULT_MODEL_ID,
    models: Object.values(MODEL_PRICING),
    features: AI_FEATURES.filter((f) => f.id !== 'unknown'),
  })
}
