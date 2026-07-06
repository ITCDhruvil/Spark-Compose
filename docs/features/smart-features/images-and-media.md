# Images and media

## What it is

Insert and manage **images** and **video embeds** with resize handles and a floating image toolbar.

## Problem it solves

Site reports need photos and diagrams with captions, alignment, and sensible sizing — without breaking layout.

## How to use

### Images

- Toolbar or slash command → insert image (upload or URL)
- Drag resize handles when image is selected
- **Image toolbar**: align left/center/right, size presets, zoom, caption, alt text, delete
- **AI caption** optional — see [image-caption.md](../ai-features/image-caption.md)

### Video

- Embed via toolbar / command palette (YouTube, Vimeo-style URLs)
- Renders as embedded player block

## Notes

- Resizable images: `resizable-image.ts`
- Image menu: `image-menu.tsx`
- Upload API: `/api/uploads/image`
