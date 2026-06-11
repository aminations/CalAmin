// Emoji picker — curated categories, tabbed, with recents.
// Exports: EmojiPicker (window)

const EMOJI_CATEGORIES = [
  {
    id: 'shifts', label: 'Shifts', icon: '🌙',
    emojis: ['🌅', '☀️', '🌆', '🌙', '💤', '🏠', '💼', '🏥', '✅', '❌', '🔁', '📋', '⏰', '🚑', '🩺', '☕'],
  },
  {
    id: 'smileys', label: 'Smileys', icon: '🙂',
    emojis: ['😀', '😄', '😂', '🙂', '😊', '😍', '🥰', '😎', '🤩', '🥳', '😴', '🤒', '😷', '😭', '😡', '😱', '🤔', '🙃', '😅', '🥺', '😇', '🤗', '😬', '🫠'],
  },
  {
    id: 'hearts', label: 'Hearts', icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💔', '⭐', '🌟', '✨', '⚡', '🔥', '💯', '❗', '❓', '🎵'],
  },
  {
    id: 'outdoors', label: 'Outdoors', icon: '🥾',
    emojis: ['🥾', '🧗', '🎒', '⛺', '🏕️', '🔥', '🧭', '🗻', '🏔️', '⛰️', '🌲', '🌄', '🌅', '🏞️', '🛶', '🚣', '🎣', '🚵', '🏃', '🌌', '🌠', '🔦', '🦅', '🐻'],
  },
  {
    id: 'activities', label: 'Activities', icon: '⚽',
    emojis: ['⚽', '🏀', '🎾', '⚾', '🏊', '🏃', '🚴', '🧘', '🏋️', '⛳', '🎮', '🎲', '🎳', '🎤', '🎸', '🎨', '🎬', '📚', '✏️', '🎉', '🎂', '🎁'],
  },
  {
    id: 'travel', label: 'Travel', icon: '✈️',
    emojis: ['✈️', '🚗', '🚕', '🚌', '🚆', '🚄', '🚢', '⛵', '🏖️', '🏔️', '🗻', '🏕️', '🗼', '🏰', '🧳', '🗺️', '⛺', '🚀', '🚲', '🛵'],
  },
  {
    id: 'food', label: 'Food', icon: '🍰',
    emojis: ['☕', '🍵', '🍺', '🍷', '🍰', '🍦', '🍩', '🍕', '🍔', '🍣', '🍜', '🍱', '🍙', '🍎', '🍓', '🍇', '🥗', '🍳', '🥞', '🍫'],
  },
  {
    id: 'nature', label: 'Nature', icon: '🌸',
    emojis: ['🌸', '🌷', '🌹', '🌻', '🍀', '🌿', '🍁', '🍂', '❄️', '⛅', '☁️', '🌧️', '⛈️', '🌈', '🌊', '🐶', '🐱', '🐦', '🦋', '🐠'],
  },
  {
    id: 'objects', label: 'Objects', icon: '💡',
    emojis: ['💻', '📱', '☎️', '📅', '📌', '📎', '✂️', '🔑', '💡', '🔋', '💊', '💉', '🏢', '🏫', '⌛', '💰', '💳', '🛒', '🧹', '🛠️'],
  },
];

const RECENTS_KEY = 'calendar-planner-recent-emojis-v1';

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, 16) : [];
  } catch (e) { return []; }
}

function pushRecent(emoji) {
  try {
    const next = [emoji, ...loadRecents().filter((e) => e !== emoji)].slice(0, 16);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    return next;
  } catch (e) { return []; }
}

function EmojiPicker({ accent, onPick, onClose }) {
  const [activeCat, setActiveCat] = React.useState('shifts');
  const [recents, setRecents] = React.useState(loadRecents);

  const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCat) || EMOJI_CATEGORIES[0];

  const handlePick = (emoji) => {
    setRecents(pushRecent(emoji));
    onPick(emoji);
  };

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
            onClick={() => setActiveCat(c.id)}
          >{c.icon}</button>
        ))}
        <div className="emoji-tabs-spacer"></div>
        <button className="emoji-tab emoji-close" title="Close" onClick={onClose}>✕</button>
      </div>

      {recents.length > 0 && (
        <div className="emoji-recents">
          <div className="emoji-section-label">Recent</div>
          <div className="emoji-grid">
            {recents.map((e, i) => (
              <button key={e + i} className="emoji-cell" onClick={() => handlePick(e)}>{e}</button>
            ))}
          </div>
        </div>
      )}

      <div className="emoji-section-label">{cat.label}</div>
      <div className="emoji-grid">
        {cat.emojis.map((e) => (
          <button key={e} className="emoji-cell" onClick={() => handlePick(e)}>{e}</button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { EmojiPicker });
