'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { RichEditor } from '@/components/editor'

export default function Home() {
  const [content, setContent] = useState('')
  /** Demo toggle — mobile hosts should pass `ai={false}` instead. */
  const [aiEnabled, setAiEnabled] = useState(true)

  return (
    <main className="min-h-screen bg-background py-6 px-4">
      <div className="w-full max-w-[88rem] mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-xl font-semibold">Spark Compose</h1>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-md border border-[#d1d1d1] dark:border-border bg-white dark:bg-background px-2.5 py-1.5 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="rounded border-border"
                data-testid="ai-plugin-toggle"
              />
              Spark AI
            </label>
            <Link
              href="/cost"
              title="Cost & Analysis"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#d1d1d1] dark:border-border bg-white dark:bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-[#e8e8e8] dark:hover:bg-white/10"
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span>Cost & Analysis</span>
            </Link>
          </div>
        </div>
        <RichEditor
          key={aiEnabled ? 'ai-on' : 'ai-off'}
          ai={aiEnabled}
          content={content}
          onChange={(json) => setContent(json)}
          minHeight="70vh"
        />
      </div>
    </main>
  )
}
