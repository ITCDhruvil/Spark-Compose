import { NextResponse } from 'next/server'

export type ParseJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }

export async function parseJsonBody<T>(req: Request): Promise<ParseJsonResult<T>> {
  let text: string
  try {
    text = await req.text()
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Could not read request body' }, { status: 400 }),
    }
  }

  if (!text.trim()) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Empty request body' }, { status: 400 }),
    }
  }

  try {
    return { ok: true, data: JSON.parse(text) as T }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    }
  }
}
