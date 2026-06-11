import { useState } from 'react'
import { EMOJI_CATEGORIES } from '../data/emojiCategories'
import { clearRecents, loadRecents, pushRecent } from '../lib/storage'

// Recents are stored 16 deep but only the freshest few are shown,
// so clearing one emoji's spot reveals older history.
const RECENTS_SHOWN = 5

interface EmojiPickerProps {
  accent: string
  onPick: (emoji: string) => void
  onClose: () => void
}

export default function EmojiPicker({ accent, onPick, onClose }: EmojiPickerProps) {
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [recents, setRecents] = useState(loadRecents)

  const cat = activeCat ? EMOJI_CATEGORIES.find((c) => c.id === activeCat) : undefined

  const handlePick = (emoji: string) => {
    setRecents(pushRecent(emoji))
    onPick(emoji)
  }

  return (
    <div className="emoji-picker" role="dialog" aria-label="Emoji picker">
      <div className="emoji-picker-tabs" role="tablist">
        {EMOJI_CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === activeCat}
            className={'emoji-tab' + (c.id === activeCat ? ' active' : '')}
            style={c.id === activeCat ? { backgroundColor: accent + '22' } : undefined}
            title={c.label}
            onClick={() => setActiveCat((cur) => (cur === c.id ? null : c.id))}
          >
            {c.icon}
          </button>
        ))}
        <div className="emoji-tabs-spacer"></div>
        <button className="emoji-tab emoji-close" title="Close" onClick={onClose}>
          ✕
        </button>
      </div>

      {recents.length > 0 && (
        <div className={'emoji-recents' + (cat ? '' : ' no-divider')}>
          <div className="emoji-recents-head">
            <div className="emoji-section-label">Recent</div>
            <button
              className="emoji-clear-btn"
              onClick={() => {
                clearRecents()
                setRecents([])
              }}
            >
              Clear
            </button>
          </div>
          <div className="emoji-grid">
            {recents.slice(0, RECENTS_SHOWN).map((e, i) => (
              <button key={e + i} className="emoji-cell" onClick={() => handlePick(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {cat ? (
        <>
          <div className="emoji-section-label">{cat.label}</div>
          <div className="emoji-grid">
            {cat.emojis.map((e) => (
              <button key={e} className="emoji-cell" onClick={() => handlePick(e)}>
                {e}
              </button>
            ))}
          </div>
        </>
      ) : (
        recents.length === 0 && <div className="emoji-hint">Pick a category above</div>
      )}
    </div>
  )
}
