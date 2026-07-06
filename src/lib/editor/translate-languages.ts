/**
 * Target languages for the AI translate panel. Values are sent to the API as plain language names.
 */

export interface TranslateLanguageOption {
  value: string
  label: string
}

export interface TranslateLanguageGroup {
  label: string
  options: TranslateLanguageOption[]
}

/** Flat list for search — English first, then common foreign languages. */
export const TRANSLATE_LANGUAGES: TranslateLanguageOption[] = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Polish', label: 'Polish' },
  { value: 'Ukrainian', label: 'Ukrainian' },
  { value: 'Czech', label: 'Czech' },
  { value: 'Romanian', label: 'Romanian' },
  { value: 'Hungarian', label: 'Hungarian' },
  { value: 'Swedish', label: 'Swedish' },
  { value: 'Norwegian', label: 'Norwegian' },
  { value: 'Danish', label: 'Danish' },
  { value: 'Finnish', label: 'Finnish' },
  { value: 'Greek', label: 'Greek' },
  { value: 'Turkish', label: 'Turkish' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Hebrew', label: 'Hebrew' },
  { value: 'Persian', label: 'Persian (Farsi)' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Bengali', label: 'Bengali' },
  { value: 'Tamil', label: 'Tamil' },
  { value: 'Telugu', label: 'Telugu' },
  { value: 'Marathi', label: 'Marathi' },
  { value: 'Gujarati', label: 'Gujarati' },
  { value: 'Kannada', label: 'Kannada' },
  { value: 'Malayalam', label: 'Malayalam' },
  { value: 'Punjabi', label: 'Punjabi' },
  { value: 'Odia', label: 'Odia (Oriya)' },
  { value: 'Assamese', label: 'Assamese' },
  { value: 'Urdu', label: 'Urdu' },
  { value: 'Sanskrit', label: 'Sanskrit' },
  { value: 'Nepali', label: 'Nepali' },
  { value: 'Sinhala', label: 'Sinhala' },
  { value: 'Chinese (Simplified)', label: 'Chinese (Simplified)' },
  { value: 'Chinese (Traditional)', label: 'Chinese (Traditional)' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Vietnamese', label: 'Vietnamese' },
  { value: 'Thai', label: 'Thai' },
  { value: 'Indonesian', label: 'Indonesian' },
  { value: 'Malay', label: 'Malay' },
  { value: 'Filipino', label: 'Filipino (Tagalog)' },
  { value: 'Swahili', label: 'Swahili' },
  { value: 'Afrikaans', label: 'Afrikaans' },
  { value: 'Catalan', label: 'Catalan' },
  { value: 'Croatian', label: 'Croatian' },
  { value: 'Serbian', label: 'Serbian' },
  { value: 'Slovak', label: 'Slovak' },
  { value: 'Bulgarian', label: 'Bulgarian' },
  { value: 'Lithuanian', label: 'Lithuanian' },
  { value: 'Latvian', label: 'Latvian' },
  { value: 'Estonian', label: 'Estonian' },
]

/** @deprecated Use TRANSLATE_LANGUAGES — kept for older imports */
export const TRANSLATE_LANGUAGE_GROUPS: TranslateLanguageGroup[] = [
  {
    label: 'Languages',
    options: TRANSLATE_LANGUAGES,
  },
]

export const DEFAULT_TRANSLATE_LANGUAGE = 'English'
