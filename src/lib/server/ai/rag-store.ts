const corpus = new Map<string, { text: string; filename: string }>()

export function ingestCorpus(sourceId: string, text: string, filename: string): void {
  corpus.set(sourceId, { text, filename })
}

export function getCorpusText(sourceIds: string[]): string {
  return sourceIds
    .map((id) => corpus.get(id)?.text)
    .filter(Boolean)
    .join('\n\n')
}

export function corpusSize(): number {
  return corpus.size
}
