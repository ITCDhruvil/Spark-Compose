import { NextResponse } from 'next/server'
import { getCostLog, listCostLogs } from '@/lib/server/ai/cost-store'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (id) {
      const entry = getCostLog(id)
      if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(entry)
    }
    const logs = listCostLogs({
      limit: Number(url.searchParams.get('limit') ?? 200),
      feature: url.searchParams.get('feature') ?? undefined,
      userId: url.searchParams.get('userId') ?? undefined,
    })
    return NextResponse.json({ logs })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load logs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
