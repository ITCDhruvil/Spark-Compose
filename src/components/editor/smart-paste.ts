import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'
import TurndownService from 'turndown'
import {
  csvToHtml,
  looksLikeCsv,
  parsePasteUrl,
} from '@/lib/editor/paste-structure'
import { parseEmbedUrl } from './extensions/video-embed'

// ── Turndown: HTML → Markdown (used only for cleanup normalization) ──────────
const td = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined',
})

td.addRule('preserveTable', {
  filter: ['table'],
  replacement(_content, node) {
    const el = node as HTMLElement
    const rows = Array.from(el.querySelectorAll('tr'))
    if (!rows.length) return ''
    const cells = (tr: Element) =>
      Array.from(tr.querySelectorAll('td,th')).map(c =>
        (c.textContent ?? '').trim().replace(/\|/g, '\\|'),
      )
    const header = '| ' + cells(rows[0]).join(' | ') + ' |'
    const sep = '| ' + cells(rows[0]).map(() => '---').join(' | ') + ' |'
    const body = rows.slice(1).map(r => '| ' + cells(r).join(' | ') + ' |').join('\n')
    return '\n\n' + [header, sep, body].filter(Boolean).join('\n') + '\n\n'
  },
})

td.addRule('codeBlock', {
  filter(node) {
    return node.nodeName === 'PRE' && !!node.firstChild && (node.firstChild as HTMLElement).nodeName === 'CODE'
  },
  replacement(_content, node) {
    const code = node.firstChild as HTMLElement
    const lang = (code.className.match(/language-(\S+)/) ?? [])[1] ?? ''
    return '\n\n```' + lang + '\n' + (code.textContent ?? '').trim() + '\n```\n\n'
  },
})

// ── Clean raw HTML from Word/Google Docs ────────────────────────────────────
function cleanHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?o:p[^>]*>/gi, '')
    .replace(/<\/?w:[^>]*>/gi, '')
    .replace(/<\/?m:[^>]*>/gi, '')
    .replace(/<\/?v:[^>]*>/gi, '')
    .replace(/<\/?xml[^>]*>/gi, '')
    .replace(/<b\s+style="font-weight:\s*normal[^"]*">([\s\S]*?)<\/b>/gi, '$1')
    .replace(/<strong\s+style="font-weight:\s*normal[^"]*">([\s\S]*?)<\/strong>/gi, '$1')
    .replace(/<i\s+style="font-style:\s*normal[^"]*">([\s\S]*?)<\/i>/gi, '$1')
    .replace(/<em\s+style="font-style:\s*normal[^"]*">([\s\S]*?)<\/em>/gi, '$1')
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/\s*class="[^"]*Mso[^"]*"/gi, '')
    .replace(/\s*style="[^"]*mso-[^"]*"/gi, '')
    .replace(/\s*style=""/gi, '')
    .replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1')
    .replace(/<p[^>]*>\s*(&nbsp;|\u00a0)?\s*<\/p>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
    .replace(/<h([1-6])[^>]*>/gi, '<h$1>')
    .replace(/<p[^>]*>/gi, '<p>')
    .replace(/<li[^>]*>/gi, '<li>')
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Browser wraps plain-text copy in trivial HTML — prefer our structured parser. */
export function isBrowserPlainTextHtml(html: string): boolean {
  if (!html.trim()) return false
  if (/\bMso|docs-internal|Word\.Document|google-sheets|content="LibreOffice/i.test(html)) {
    return false
  }
  if (/<(h[1-6]|table|ul|ol|li|pre|blockquote)\b/i.test(html)) return false
  const tags = [...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[1].toLowerCase())
  const allowed = new Set([
    'html', 'head', 'body', 'meta', 'link', 'p', 'div', 'br', 'span',
    'b', 'strong', 'i', 'em', 'u', 'a',
  ])
  return tags.length > 0 && tags.every((t) => allowed.has(t))
}

// ── Detect markdown by common patterns ──────────────────────────────────────
function looksLikeMarkdown(text: string): boolean {
  return /(?:^|\n)#{1,6}\s/.test(text) ||
    /(?:^|\n)```/.test(text) ||
    /(?:^|\n)>\s/.test(text) ||
    /(?:^|\n)\|.+\|/.test(text) ||
    /\*\*[^*]+\*\*/.test(text) ||
    /\[.+\]\(.+\)/.test(text)
}

/** Numbered sections + bullets without markdown syntax (method statements, reports). */
export function looksLikeStructuredDocument(text: string): boolean {
  if (looksLikeMarkdown(text)) return false
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return false
  const numbered = lines.filter((l) => /^\d+[.)]\s+\S/.test(l)).length
  const bullets = lines.filter((l) => /^[-•*–—]\s+\S/.test(l)).length
  const hasTitle = lines.some((l) => /[—–-]/.test(l) && l.length > 12)
  return numbered >= 2 || (numbered >= 1 && bullets >= 1) || (hasTitle && numbered >= 1)
}

type StructuredBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

function parseNumberedLine(line: string): { num: number; label: string } | null {
  const m = line.trim().match(/^(\d+)[.)]\s+(.+)$/)
  if (!m) return null
  return { num: parseInt(m[1], 10), label: m[2].trim() }
}

function parseBulletLine(line: string): string | null {
  const m = line.trim().match(/^[-•*–—]\s+(.+)$/)
  return m ? m[1].trim() : null
}

function isShortSectionLabel(label: string): boolean {
  const words = label.split(/\s+/).filter(Boolean)
  if (words.length <= 6 && label.length <= 72) return true
  return words.length <= 3
}

function nextNonEmptyLine(lines: string[], from: number): { index: number; text: string } | null {
  for (let j = from; j < lines.length; j++) {
    const t = lines[j].trim()
    if (t) return { index: j, text: t }
  }
  return null
}

function isDocumentTitle(line: string, lineIndex: number, lines: string[]): boolean {
  if (lineIndex > 0) return false
  const t = line.trim()
  if (!t) return false
  if (parseBulletLine(t) || parseNumberedLine(t)) return false
  if (/[—–-]/.test(t) && t.length >= 10) return true
  if (/^(method statement|rams|toolbox talk|site instruction|inspection report|progress report)\b/i.test(t)) {
    return true
  }
  const nxt = nextNonEmptyLine(lines, lineIndex + 1)
  if (nxt) {
    const num = parseNumberedLine(nxt.text)
    if (num && isShortSectionLabel(num.label)) return true
  }
  return t.length < 140 && !/^\d+[.)]\s/.test(t) && !t.endsWith('.')
}

/** Parse plain text into document blocks (titles, sections, lists, paragraphs). */
export function parseStructuredBlocks(text: string): StructuredBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: StructuredBlock[] = []
  let i = 0
  let seenContent = false

  while (i < lines.length) {
    const raw = lines[i]
    const trimmed = raw.trim()
    if (!trimmed) {
      i++
      continue
    }

    if (!seenContent && isDocumentTitle(trimmed, i, lines)) {
      blocks.push({ type: 'h1', text: trimmed })
      seenContent = true
      i++
      continue
    }
    seenContent = true

    const bullet = parseBulletLine(raw)
    if (bullet) {
      const items: string[] = []
      while (i < lines.length) {
        const b = parseBulletLine(lines[i])
        if (!b) break
        items.push(b)
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    const numbered = parseNumberedLine(raw)
    if (numbered) {
      const nxt = nextNonEmptyLine(lines, i + 1)
      const nxtNumbered = nxt ? parseNumberedLine(nxt.text) : null

      // Two or more consecutive numbered lines → ordered list (steps)
      if (nxtNumbered && nxtNumbered.num === numbered.num + 1) {
        const items: string[] = []
        let expected = numbered.num
        let j = i
        while (j < lines.length) {
          const n = parseNumberedLine(lines[j])
          if (!n || n.num !== expected) break
          items.push(n.label)
          expected++
          j++
        }
        blocks.push({ type: 'ol', items })
        i = j
        continue
      }

      // Single numbered line with short label → section heading (e.g. "1. Scope")
      if (isShortSectionLabel(numbered.label)) {
        blocks.push({ type: 'h2', text: numbered.label })
        i++
        continue
      }

      blocks.push({ type: 'ol', items: [numbered.label] })
      i++
      continue
    }

    if (trimmed === trimmed.toUpperCase() && trimmed.length < 80 && /[A-Z]/.test(trimmed)) {
      blocks.push({ type: 'h3', text: trimmed })
      i++
      continue
    }

    if (/:\s*$/.test(trimmed) && trimmed.length < 100) {
      blocks.push({ type: 'h3', text: trimmed.replace(/:\s*$/, '') })
      i++
      continue
    }

    const para: string[] = [trimmed]
    i++
    while (i < lines.length) {
      const t = lines[i].trim()
      if (!t) break
      if (parseBulletLine(lines[i]) || parseNumberedLine(lines[i])) break
      if (t === t.toUpperCase() && t.length < 80 && /[A-Z]/.test(t)) break
      para.push(t)
      i++
    }
    blocks.push({ type: 'p', text: para.join(' ') })
  }

  return blocks
}

export function structuredBlocksToHtml(blocks: StructuredBlock[]): string {
  return blocks.map((b) => {
    switch (b.type) {
      case 'h1':
        return `<h1>${esc(b.text)}</h1>`
      case 'h2':
        return `<h2>${esc(b.text)}</h2>`
      case 'h3':
        return `<h3>${esc(b.text)}</h3>`
      case 'p':
        return `<p>${esc(b.text)}</p>`
      case 'ul':
        return `<ul>${b.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`
      case 'ol':
        return `<ol>${b.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ol>`
      default:
        return ''
    }
  }).join('\n')
}

export function structuredTextToHtml(text: string): string {
  return structuredBlocksToHtml(parseStructuredBlocks(text))
}

// ── Markdown → clean HTML ────────────────────────────────────────────────────
function markdownToHtml(md: string): string {
  let html = md

  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) =>
    `<pre><code${lang ? ` class="language-${lang}"` : ''}>${esc(code.trim())}</code></pre>`)

  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/^---+$/gm, '<hr>')
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>')

  html = html.replace(/((?:^\|.+\|\n?)+)/gm, (block) => {
    const rows = block.trim().split('\n')
    const isSep = (r: string) => /^\|[\s|:-]+\|$/.test(r.trim())
    const data = rows.filter((r) => !isSep(r))
    if (data.length === 0) return block
    const cells = (r: string) =>
      r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
    const [head, ...body] = data
    const ths = cells(head).map((c) => `<th>${c}</th>`).join('')
    const trs = body.map((r) =>
      `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
  })

  html = html.replace(/((?:^\d+\.\s+.+\n?)+)/gm, (block) =>
    '<ol>' + block.trim().split('\n').map((l) =>
      `<li>${l.replace(/^\d+\.\s+/, '')}</li>`).join('') + '</ol>')

  html = html.replace(/((?:^[-*+]\s+.+\n?)+)/gm, (block) =>
    '<ul>' + block.trim().split('\n').map((l) =>
      `<li>${l.replace(/^[-*+]\s+/, '')}</li>`).join('') + '</ul>')

  html = html
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  html = html
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (/^<(h[1-6]|ul|ol|li|pre|table|blockquote|hr)/.test(trimmed)) return trimmed
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`
    })
    .filter(Boolean)
    .join('\n')

  return html
}

// ── Main conversion ──────────────────────────────────────────────────────────
export function convertPastedContent(text: string, html: string): string {
  if (html.includes('data-pm-slice')) return ''

  const plain = text.trim()
  const htmlTrim = html.trim()

  // Rich HTML from Word / Google Docs / browser with real structure
  if (htmlTrim && !isBrowserPlainTextHtml(htmlTrim)) {
    const cleaned = cleanHtml(htmlTrim)
    if (/<(h[1-6]|table|ul|ol|li|pre|blockquote)\b/i.test(cleaned)) {
      return cleaned
    }
  }

  if (!plain && !htmlTrim) return ''

  // Tab/comma-separated spreadsheet paste
  if (plain && looksLikeCsv(plain)) {
    const tableHtml = csvToHtml(plain)
    if (tableHtml) return tableHtml
  }

  // Structured construction docs, reports, method statements
  if (plain && looksLikeStructuredDocument(plain)) {
    return structuredTextToHtml(plain)
  }

  if (plain && looksLikeMarkdown(plain)) {
    return markdownToHtml(plain)
  }

  if (plain) {
    return structuredTextToHtml(plain)
  }

  return ''
}

function isInsideAskPrompt(view: { state: { selection: { $from: { depth: number; node: (d: number) => { type: { name: string } }; parent: { type: { name: string } } } } } }) {
  const { $from } = view.state.selection
  if ($from.parent.type.name === 'askPrompt') return true
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'askPrompt') return true
  }
  return false
}

function clipboardToInlineText(cd: DataTransfer): string {
  const plain = cd.getData('text/plain')
  if (plain) return plain.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ')
  const html = cd.getData('text/html')
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent ?? '').replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ')
}

// ── Tiptap extension ─────────────────────────────────────────────────────────
export const SmartPaste = Extension.create({
  name: 'smartPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('smartPaste'),
        props: {
          handlePaste(view, event) {
            const cd = event.clipboardData
            if (!cd) return false

            if (isInsideAskPrompt(view)) {
              const flat = clipboardToInlineText(cd)
              event.preventDefault()
              if (!flat) return true
              const { from, to } = view.state.selection
              view.dispatch(view.state.tr.insertText(flat, from, to).scrollIntoView())
              return true
            }

            const htmlData = cd.getData('text/html') || ''
            const textData = cd.getData('text/plain') || ''

            if (htmlData.includes('data-pm-slice')) return false
            if (!textData.trim() && !htmlData.trim()) return false

            const trimmedText = textData.trim()

            // Single URL → video embed or image
            const urlTarget = parsePasteUrl(trimmedText)
            if (urlTarget && !htmlData.trim()) {
              event.preventDefault()
              const { from, to } = view.state.selection
              if (urlTarget.kind === 'video') {
                const parsed = parseEmbedUrl(urlTarget.url)
                if (parsed) {
                  const node = view.state.schema.nodes.videoEmbed?.create({
                    src: parsed.src,
                    provider: parsed.provider,
                    originalUrl: urlTarget.url,
                  })
                  if (node) {
                    view.dispatch(
                      view.state.tr.replaceRangeWith(from, to, node).scrollIntoView(),
                    )
                    return true
                  }
                }
              }
              if (urlTarget.kind === 'image') {
                const node = view.state.schema.nodes.image?.create({
                  src: urlTarget.url,
                  align: 'center',
                  sizePreset: '100',
                })
                if (node) {
                  view.dispatch(
                    view.state.tr.replaceRangeWith(from, to, node).scrollIntoView(),
                  )
                  return true
                }
              }
            }

            const convertedHtml = convertPastedContent(textData, htmlData)
            if (!convertedHtml) return false

            const wrapper = document.createElement('div')
            wrapper.innerHTML = convertedHtml

            const pmParser = ProseMirrorDOMParser.fromSchema(view.state.schema)
            const parsedDoc = pmParser.parse(wrapper)
            const slice = parsedDoc.slice(0)

            event.preventDefault()

            const { tr, selection } = view.state
            const { from, to } = selection

            view.dispatch(
              tr
                .replaceRange(from, to, slice)
                .scrollIntoView(),
            )

            return true
          },
        },
      }),
    ]
  },
})
