'use client'

import { useState } from 'react'
import { RichEditor } from '@/components/editor/rich-editor'

export default function Home() {
  const [content, setContent] = useState('')

  return (
    <main className="min-h-screen bg-muted/20 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Rich Editor</h1>
        <RichEditor
          content={content}
          onChange={(json) => setContent(json)}
          minHeight="70vh"
        />
      </div>
    </main>
  )
}
