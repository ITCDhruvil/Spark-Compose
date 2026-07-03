/**
 * Target languages for the AI translate panel. Values are sent to the API as plain language names.
 */

export interface TranslateLanguageOption {
  value: string;
  label: string;
}

export interface TranslateLanguageGroup {
  label: string;
  options: TranslateLanguageOption[];
}

/** Indian languages first, then other common targets. */
export const TRANSLATE_LANGUAGE_GROUPS: TranslateLanguageGroup[] = [
  {
    label: 'Indian languages',
    options: [
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
      { value: 'Konkani', label: 'Konkani' },
      { value: 'Sanskrit', label: 'Sanskrit' },
      { value: 'Kashmiri', label: 'Kashmiri' },
      { value: 'Nepali', label: 'Nepali' },
      { value: 'Manipuri', label: 'Manipuri (Meitei)' },
      { value: 'Bodo', label: 'Bodo' },
      { value: 'Dogri', label: 'Dogri' },
      { value: 'Maithili', label: 'Maithili' },
      { value: 'Santali', label: 'Santali' },
      { value: 'Sindhi', label: 'Sindhi' },
    ],
  },
  {
    label: 'Other languages',
    options: [
      { value: 'Spanish', label: 'Spanish' },
      { value: 'French', label: 'French' },
      { value: 'German', label: 'German' },
      { value: 'Italian', label: 'Italian' },
      { value: 'Portuguese', label: 'Portuguese' },
      { value: 'Dutch', label: 'Dutch' },
      { value: 'Japanese', label: 'Japanese' },
      { value: 'Korean', label: 'Korean' },
      { value: 'Chinese (Simplified)', label: 'Chinese (Simplified)' },
      { value: 'Arabic', label: 'Arabic' },
      { value: 'Russian', label: 'Russian' },
      { value: 'Polish', label: 'Polish' },
      { value: 'Turkish', label: 'Turkish' },
      { value: 'Vietnamese', label: 'Vietnamese' },
      { value: 'Thai', label: 'Thai' },
      { value: 'Greek', label: 'Greek' },
      { value: 'Hebrew', label: 'Hebrew' },
      { value: 'Indonesian', label: 'Indonesian' },
      { value: 'Swedish', label: 'Swedish' },
    ],
  },
];
