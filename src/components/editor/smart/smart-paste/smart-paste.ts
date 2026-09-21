import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'
import TurndownService from 'turndown'
import {
  csvToHtml,
  looksLikeCsv,
  parsePasteUrl,
} from '@/lib/editor/smart/smart-paste/paste-structure'
import {
  type StructuredBlock,
  type PasteLineHint,
  classifyPasteLines,
  classifyPasteToHtml,
  extractLineHintsFromHtml,
  normalizeChecklistHtml,
  normalizePasteNewlines,
} from '@/lib/editor/smart/smart-paste/paste-line-classifier'
import { parseEmbedUrl } from '@/components/editor/core/media/extensions/video-embed'

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
  const lines = normalizePasteNewlines(text).split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return false
  const numbered = lines.filter((l) => /^\d+[.)]\s+\S/.test(l)).length
  const bullets = lines.filter((l) => /^[-•*–—·▪]/.test(l)).length
  const hasTitle = lines.some((l) => /[—–-]/.test(l) && l.length > 12)
  return numbered >= 2 || (numbered >= 1 && bullets >= 1) || (hasTitle && numbered >= 1)
}

export type { StructuredBlock, PasteLineHint }

/** @deprecated Use classifyPasteLines */
export function parseStructuredBlocks(text: string): StructuredBlock[] {
  return classifyPasteLines(text)
}

export function structuredTextToHtml(text: string): string {
  return classifyPasteToHtml(text)
}

/** True when HTML is only paragraphs/divs — typical unformatted Word paste. */
export function isParagraphOnlyHtml(html: string): boolean {
  if (!html.trim()) return false
  if (/<(h[1-6]|table|ul|ol|li|pre|blockquote)\b/i.test(html)) return false
  return /<(p|div|br)\b/i.test(html)
}

/** Pull line-broken plain text from trivial HTML (Word / browser copy). */
export function htmlToPlainLines(html: string): string {
  let s = cleanHtml(html)
  s = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00a0/g, ' ')
  return s.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function resolvePastePlainText(text: string, html: string): string {
  const plain = normalizePasteNewlines(text).trim()
  const htmlTrim = html.trim()

  if (!htmlTrim) return plain

  const cleaned = cleanHtml(htmlTrim)
  const fromHtml = htmlToPlainLines(cleaned).trim()
  if (!fromHtml) return plain

  const plainLines = plain ? plain.split('\n').filter((l) => l.trim()).length : 0
  const htmlLines = fromHtml.split('\n').filter((l) => l.trim()).length

  // Prefer HTML line breaks when Word sends <p> per line but plain text is flattened
  if (!plain || htmlLines > plainLines) return fromHtml
  if (isParagraphOnlyHtml(cleaned) && htmlLines >= 2) return fromHtml
  return plain
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
export function convertPastedContent(
  text: string,
  html: string,
  hints: PasteLineHint[] = [],
): string {
  if (html.includes('data-pm-slice')) return ''

  const htmlTrim = html.trim()
  const plain = resolvePastePlainText(text, html)
  const lineHints = hints.length > 0 ? hints : (htmlTrim ? extractLineHintsFromHtml(htmlTrim) : [])

  // Rich HTML from Word / Google Docs with real semantic structure
  if (htmlTrim && !isBrowserPlainTextHtml(htmlTrim)) {
    const cleaned = cleanHtml(htmlTrim)
    if (/<(h[1-6]|table|ul|ol|li|pre|blockquote)\b/i.test(cleaned)) {
      return normalizeChecklistHtml(cleaned)
    }
  }

  if (!plain && !htmlTrim) return ''

  // Tab/comma-separated spreadsheet paste
  if (plain && looksLikeCsv(plain)) {
    const tableHtml = csvToHtml(plain)
    if (tableHtml) return tableHtml
  }

  if (plain && looksLikeMarkdown(plain)) {
    return markdownToHtml(plain)
  }

  if (plain) {
    const classified = classifyPasteToHtml(plain, lineHints)
    return normalizeChecklistHtml(classified)
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

            const lineHints = htmlData ? extractLineHintsFromHtml(htmlData) : []
            const convertedHtml = convertPastedContent(textData, htmlData, lineHints)
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
