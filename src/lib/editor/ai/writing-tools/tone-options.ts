/** Predefined tone presets for the selection AI menu. */
export interface ToneOption {
  label: string
  /** Instruction sent to the custom-tone API */
  prompt: string
  group: 'tone' | 'prompt'
}

export const TONE_OPTIONS: ToneOption[] = [
  { label: 'Professional', prompt: 'Rewrite in a professional business tone.', group: 'tone' },
  { label: 'Casual', prompt: 'Rewrite in a casual, conversational tone.', group: 'tone' },
  { label: 'Formal', prompt: 'Rewrite in a formal, polished tone.', group: 'tone' },
  { label: 'Friendly', prompt: 'Rewrite in a warm, friendly tone.', group: 'tone' },
  { label: 'Executive', prompt: 'Rewrite as a concise executive briefing.', group: 'tone' },
  { label: 'Technical', prompt: 'Rewrite in a precise technical tone.', group: 'tone' },
  { label: 'Empathetic', prompt: 'Rewrite in an empathetic, supportive tone.', group: 'tone' },
  { label: 'Confident', prompt: 'Rewrite in a confident, assertive tone.', group: 'tone' },
  { label: 'Neutral', prompt: 'Rewrite in a neutral, objective tone.', group: 'tone' },
  { label: 'Enthusiastic', prompt: 'Rewrite in an enthusiastic, energetic tone.', group: 'tone' },
]

/** Predefined rewrite prompts (same API as tone). */
export const PROMPT_OPTIONS: ToneOption[] = [
  { label: 'Simplify', prompt: 'Simplify the language so it is easier to understand.', group: 'prompt' },
  { label: 'Concise', prompt: 'Make the text more concise without losing key meaning.', group: 'prompt' },
  { label: 'Clarify', prompt: 'Rewrite for maximum clarity and precision.', group: 'prompt' },
  { label: 'Expand', prompt: 'Expand slightly with clearer detail while staying faithful to the original.', group: 'prompt' },
  { label: 'Bullets', prompt: 'Rewrite as a clear bullet-point list.', group: 'prompt' },
  { label: 'Persuasive', prompt: 'Rewrite in a more persuasive, confident tone.', group: 'prompt' },
  { label: 'Fix grammar', prompt: 'Fix grammar, spelling, and punctuation without changing meaning.', group: 'prompt' },
  { label: 'Active voice', prompt: 'Rewrite using active voice where possible.', group: 'prompt' },
  { label: 'Shorter sentences', prompt: 'Break into shorter, clearer sentences.', group: 'prompt' },
  { label: 'More formal email', prompt: 'Rewrite as a polite, formal email message.', group: 'prompt' },
]

/** Flat searchable list: tones first, then prompts. */
export const ALL_TONE_OPTIONS: ToneOption[] = [...TONE_OPTIONS, ...PROMPT_OPTIONS]
