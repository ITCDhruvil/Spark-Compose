import { NextResponse } from 'next/server'
import { getUserInsights } from '@/lib/server/ai/cost-store'

export async function GET() {
  try {
    return NextResponse.json({ users: getUserInsights() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load users'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
