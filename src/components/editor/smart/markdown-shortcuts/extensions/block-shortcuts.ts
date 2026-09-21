import { Extension } from '@tiptap/core'
import {
  deleteCurrentBlock,
  duplicateCurrentBlock,
  moveCurrentBlock,
} from '@/lib/editor/core/formatting/block-utils'
import { insertLastTable } from '@/components/editor/smart/slash-commands/slash-command-items'

export const BlockShortcuts = Extension.create({
  name: 'blockShortcuts',

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-ArrowUp': () => moveCurrentBlock(this.editor, 'up'),
      'Mod-Shift-ArrowDown': () => moveCurrentBlock(this.editor, 'down'),
      'Mod-Shift-d': () => duplicateCurrentBlock(this.editor),
      'Mod-Shift-Backspace': () => deleteCurrentBlock(this.editor),
      'Mod-Alt-t': () => {
        insertLastTable(this.editor)
        return true
      },
    }
  },
})
