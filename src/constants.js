// ── Video Format Options ──
export const VIDEO_FORMATS = [
  { value: 'shorts', icon: '⚡', label: 'YouTube Shorts', sublabel: '~60 seconds' },
  { value: 'medium', icon: '🎬', label: 'Medium Video', sublabel: '3–5 minutes' },
  { value: 'long',   icon: '📺', label: 'Full Video',    sublabel: '8–12 minutes' },
];

export const VIDEO_FORMAT_LABELS = {
  shorts: 'YouTube Short (~60 seconds)',
  medium: 'Medium Video (3–5 minutes)',
  long:   'Full Video (8–12 minutes)',
};

// ── Content Category Options ──
export const CATEGORIES = [
  { value: 'quran',    icon: '📖', label: 'Quran & Tafsir' },
  { value: 'hadith',   icon: '🌙', label: 'Hadith & Sunnah' },
  { value: 'prophets', icon: '⭐', label: "Prophets' Stories" },
  { value: 'history',  icon: '🕌', label: 'Islamic History' },
  { value: 'fiqh',     icon: '⚖️', label: 'Fiqh & Rulings' },
  { value: 'dua',      icon: '🤲', label: 'Duas & Dhikr' },
  { value: 'akhira',   icon: '🌟', label: 'Akhirah & Jannah' },
  { value: 'modern',   icon: '💡', label: 'Modern Issues' },
];

export const CATEGORY_LABELS = {
  quran:    'Quran & Tafsir',
  hadith:   'Hadith & Sunnah',
  prophets: "Prophets' Stories",
  history:  'Islamic History',
  fiqh:     'Fiqh & Rulings',
  dua:      'Duas & Dhikr',
  akhira:   'Akhirah & Jannah',
  modern:   'Modern Islamic Issues',
};

// ── Tone & Style Options ──
export const TONES = [
  { value: 'educational',   label: 'Educational' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'storytelling',  label: 'Story-based' },
  { value: 'reminder',      label: 'Gentle Reminder' },
  { value: 'qa',            label: 'Q&A Style' },
];

export const TONE_LABELS = {
  educational:   'Educational',
  inspirational: 'Inspirational',
  storytelling:  'Story-based Narrative',
  reminder:      'Gentle Reminder',
  qa:            'Q&A Style',
};
