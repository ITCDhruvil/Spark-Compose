import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
])

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const entry = form.get('file')
    if (!entry || typeof entry === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const file = entry as Blob & { name?: string; type?: string }
    const mediaType = (file.type || '').toLowerCase()
    if (mediaType && !ALLOWED.has(mediaType) && !mediaType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!buffer.length) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 })
    }
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be 8 MB or smaller' }, { status: 400 })
    }

    const originalName = typeof file.name === 'string' ? file.name : 'upload.png'
    const ext = (originalName.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
    const filename = `${randomUUID()}.${ext}`
    const mime = mediaType || 'image/png'
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`

    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, filename), buffer)
      return NextResponse.json({
        url: `/uploads/${filename}`,
        filename,
      })
    } catch {
      // Vercel cannot persist files under public/; return an inline data URL instead.
      return NextResponse.json({
        url: dataUrl,
        filename,
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
