'use client'

import { createContext, useContext } from 'react'

const EditorAiContext = createContext(true)

export function EditorAiProvider({
  aiEnabled,
  children,
}: {
  aiEnabled: boolean
  children: React.ReactNode
}) {
  return (
    <EditorAiContext.Provider value={aiEnabled}>
      {children}
    </EditorAiContext.Provider>
  )
}

/** Whether Spark AI (LLM) is enabled for this RichEditor instance. */
export function useEditorAiEnabled(): boolean {
  return useContext(EditorAiContext)
}
