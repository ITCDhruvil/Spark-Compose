import { NextResponse } from 'next/server'
import { getCostOverview } from '@/lib/server/ai/cost-store'

export async function GET() {
  try {
    return NextResponse.json(getCostOverview())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load overview'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
