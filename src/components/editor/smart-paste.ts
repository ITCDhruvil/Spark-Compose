import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'
import TurndownService from 'turndown'

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
        (c.textContent ?? '').trim().replace(/\|/g, '\\|')
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

// ── Detect markdown by common patterns ──────────────────────────────────────
function looksLikeMarkdown(text: string): boolean {
  return /(?:^|\n)#{1,6}\s/.test(text) ||
    /(?:^|\n)\s*[-*+]\s/.test(text) ||
    /(?:^|\n)\d+\.\s/.test(text) ||
    /(?:^|\n)```/.test(text) ||
    /(?:^|\n)>\s/.test(text) ||
    /(?:^|\n)\|.+\|/.test(text) ||
    /\*\*[^*]+\*\*/.test(text) ||
    /\[.+\]\(.+\)/.test(text)
}

// ── Markdown → clean HTML ────────────────────────────────────────────────────
function markdownToHtml(md: string): string {
  let html = md

  // Fenced code blocks (must be first)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) =>
    `<pre><code${lang ? ` class="language-${lang}"` : ''}>${esc(code.trim())}</code></pre>`)

  // Headings
  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr>')

  // Blockquote
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>')

  // Tables: | col | col |
  html = html.replace(/((?:^\|.+\|\n?)+)/gm, block => {
    const rows = block.trim().split('\n')
    const isSep = (r: string) => /^\|[\s|:-]+\|$/.test(r.trim())
    const data = rows.filter(r => !isSep(r))
    if (data.length === 0) return block
    const cells = (r: string) =>
      r.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
    const [head, ...body] = data
    const ths = cells(head).map(c => `<th>${c}</th>`).join('')
    const trs = body.map(r =>
      `<tr>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
  })

  // Ordered lists — group consecutive `1.` lines
  html = html.replace(/((?:^\d+\.\s+.+\n?)+)/gm, block =>
    '<ol>' + block.trim().split('\n').map(l =>
      `<li>${l.replace(/^\d+\.\s+/, '')}</li>`).join('') + '</ol>')

  // Unordered lists — group consecutive `- ` or `* ` lines
  html = html.replace(/((?:^[-*+]\s+.+\n?)+)/gm, block =>
    '<ul>' + block.trim().split('\n').map(l =>
      `<li>${l.replace(/^[-*+]\s+/, '')}</li>`).join('') + '</ul>')

  // Inline: bold+italic, bold, italic, strikethrough, code, image, link
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

  // Paragraphs: blocks not already wrapped in a tag
  html = html
    .split(/\n{2,}/)
    .map(block => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (/^<(h[1-6]|ul|ol|li|pre|table|blockquote|hr)/.test(trimmed)) return trimmed
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`
    })
    .filter(Boolean)
    .join('\n')

  return html
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Plain text → paragraphs ──────────────────────────────────────────────────
function plainToHtml(text: string): string {
  // Try to detect heading-like lines (ALL CAPS short lines, or bold-prefixed)
  const lines = text.split('\n')
  const result: string[] = []
  let listBuf: string[] = []
  let listType = ''

  const flushList = () => {
    if (!listBuf.length) return
    const tag = listType === 'ol' ? 'ol' : 'ul'
    result.push(`<${tag}>${listBuf.map(l => `<li>${esc(l)}</li>`).join('')}</${tag}>`)
    listBuf = []
    listType = ''
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Blank line = paragraph break
    if (!trimmed) {
      flushList()
      continue
    }

    // Numbered list: "1. " or "1) "
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/)
    if (numMatch) {
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listBuf.push(numMatch[2])
      continue
    }

    // Bullet list: "- " or "• " or "* "
    const bulletMatch = trimmed.match(/^[-•*]\s+(.+)$/)
    if (bulletMatch) {
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listBuf.push(bulletMatch[1])
      continue
    }

    flushList()

    // Short ALL CAPS line or ends with ":" → treat as heading
    if (
      trimmed === trimmed.toUpperCase() &&
      trimmed.length < 80 &&
      /[A-Z]/.test(trimmed)
    ) {
      result.push(`<h3>${esc(trimmed)}</h3>`)
      continue
    }

    result.push(`<p>${esc(trimmed).replace(/\n/g, '<br>')}</p>`)
  }

  flushList()
  return result.join('\n')
}

// ── Main conversion ──────────────────────────────────────────────────────────
function convert(text: string, html: string): string {
  // Internal Tiptap clipboard — handled by Tiptap itself
  if (html.includes('data-pm-slice')) return ''

  // Rich HTML from Word / Google Docs / browser
  if (html.trim()) {
    const cleaned = cleanHtml(html)
    // If it has block-level structure, use HTML path
    if (/<(h[1-6]|table|ul|ol|li|pre|blockquote)\b/i.test(cleaned)) {
      return cleaned
    }
  }

  // Markdown text
  if (looksLikeMarkdown(text)) {
    return markdownToHtml(text)
  }

  // Plain text
  return plainToHtml(text)
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

            const htmlData = cd.getData('text/html') || ''
            const textData = cd.getData('text/plain') || ''

            // Let Tiptap handle its own internal paste
            if (htmlData.includes('data-pm-slice')) return false
            // Nothing to convert
            if (!textData.trim() && !htmlData.trim()) return false

            const convertedHtml = convert(textData, htmlData)
            if (!convertedHtml) return false

            // Parse HTML string into a DOM element
            const wrapper = document.createElement('div')
            wrapper.innerHTML = convertedHtml

            // Use ProseMirror's DOMParser to turn DOM → ProseMirror nodes
            const pmParser = ProseMirrorDOMParser.fromSchema(view.state.schema)
            const parsedDoc = pmParser.parse(wrapper)
            const slice = parsedDoc.slice(0)

            event.preventDefault()

            const { tr, selection } = view.state
            const { from, to } = selection

            // Replace selection or insert at cursor
            view.dispatch(
              tr
                .replaceRange(from, to, slice)
                .scrollIntoView()
            )

            return true
          },
        },
      }),
    ]
  },
})
