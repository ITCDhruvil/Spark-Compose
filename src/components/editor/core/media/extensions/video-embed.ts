import { Node, mergeAttributes } from '@tiptap/core'

function parseEmbedUrl(url: string): { src: string; provider: string } | null {
  const trimmed = url.trim()
  const yt = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/i)
  if (yt) return { src: `https://www.youtube.com/embed/${yt[1]}`, provider: 'youtube' }
  const vimeo = trimmed.match(/vimeo\.com\/(\d+)/i)
  if (vimeo) return { src: `https://player.vimeo.com/video/${vimeo[1]}`, provider: 'vimeo' }
  return null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (url: string) => ReturnType
    }
  }
}

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      provider: { default: 'youtube' },
      originalUrl: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-video-embed] iframe' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-video-embed': HTMLAttributes.provider,
        class: 'video-embed',
      }),
      [
        'iframe',
        {
          src: HTMLAttributes.src,
          frameborder: '0',
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: 'true',
        },
      ],
    ]
  },

  addCommands() {
    return {
      setVideoEmbed:
        (url: string) =>
        ({ commands }) => {
          const parsed = parseEmbedUrl(url)
          if (!parsed) return false
          return commands.insertContent({
            type: this.name,
            attrs: { src: parsed.src, provider: parsed.provider, originalUrl: url },
          })
        },
    }
  },
})

export { parseEmbedUrl }
