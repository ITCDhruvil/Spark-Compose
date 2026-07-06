import { NextResponse } from 'next/server'
import { getFeatureInsights } from '@/lib/server/ai/cost-store'
import { AI_FEATURES } from '@/lib/server/ai/cost-types'

export async function GET() {
  try {
    return NextResponse.json({
      features: getFeatureInsights(),
      catalog: AI_FEATURES.filter((f) => f.id !== 'unknown'),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load features'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
