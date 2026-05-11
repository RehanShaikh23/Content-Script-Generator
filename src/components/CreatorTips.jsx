import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const TIPS = [
  {
    icon: '👁️',
    title: 'Upload Visibility Strategy',
    body: 'After uploading your Short, always set the visibility to "Unlisted" first instead of Public. This gives you time to properly optimize the title, description, tags, and thumbnail before making it live. Once everything is polished, switch to Public.',
  },
  {
    icon: '🎯',
    title: 'Strong Title Optimization',
    body: 'Create a clear, engaging title directly from the generated script. Make sure the title is easy to read and instantly grabs attention. A strong title is the #1 factor for click-through rate on Shorts.',
  },
  {
    icon: '#️⃣',
    title: 'Use Only 3 Hashtags in Title',
    body: 'Never overload the title with hashtags. Use only 3 relevant hashtags so viewers can clearly read the title without distraction. More hashtags = less readability = fewer clicks.',
  },
  {
    icon: '🏷️',
    title: 'Relevant Hashtags Only',
    body: 'Use only niche-relevant hashtags like #IslamicShorts, #Quran, #IslamicReminder, #ProphetStories. Avoid random trending hashtags — quality matters more than quantity. Irrelevant tags confuse the algorithm.',
  },
  {
    icon: '📋',
    title: 'Copy Title into Description',
    body: 'Copy your full title along with hashtags and paste it into the description section. This improves discoverability and consistency — YouTube indexes description text for search.',
  },
  {
    icon: '🏷️',
    title: 'Add YouTube Studio Tags',
    body: 'Go to YouTube Studio → Video Details → Tags section and add up to 5–6 relevant tags. Do not overstuff.',
    tags: ['Islamic', 'Islam & Science', 'Prophets', 'Quran Facts', 'Islamic Motivation', 'Muslim Reminder'],
  },
  {
    icon: '⚠️',
    title: 'Always Add Disclaimer',
    body: 'Your description should always include a proper disclaimer for Islamic content, especially when sharing historical, educational, or interpretative content. This builds trust and protects your channel.',
  },
  {
    icon: '⏰',
    title: 'Best Upload Time Strategy',
    body: 'My best-performing upload time is usually 6 PM to 7 PM (Indian time), but your best timing may be different.',
    extra: 'Ask your audience directly using polls, stories, or community posts: "What time are you usually active on social media?" Upload only during your audience\'s active hours for maximum reach.',
  },
  {
    icon: '🛠️',
    title: 'Tools I Use to Edit My Videos',
    body: 'Here are the exact tools I use daily to create my Islamic Shorts. Each one plays a specific role in the production workflow from voice generation to final editing.',
    tools: [
      { emoji: '🎙️', name: 'ElevenLabs', role: 'AI Voice Generation', desc: 'For creating natural, high-quality voiceovers from scripts' },
      { emoji: '✂️', name: 'CapCut', role: 'Video Editing', desc: 'For editing, subtitles, transitions, and final export' },
      { emoji: '🎵', name: 'Nasheeds', role: 'Background Audio', desc: 'Sourced from YouTube and Instagram nasheed pages' },
      { emoji: '🎬', name: 'Video Clips', role: 'Visual Content', desc: 'Sourced from Pexels, Pinterest, and Instagram' },
    ],
  },
];

export default function CreatorTips() {
  const { isPremium } = useAuth();
  const [expandedIdx, setExpandedIdx] = useState(null);

  const toggle = (i) => setExpandedIdx(prev => (prev === i ? null : i));

  /* ─── Locked state for free users ─── */
  if (!isPremium) {
    return (
      <div className="creator-tips creator-tips--locked">
        <div className="creator-tips__lock-overlay">
          <img
            src="/muslim-empire-logo.jpg"
            alt="Muslim Empire"
            className="creator-tips__logo creator-tips__logo--locked"
          />
          <div className="creator-tips__lock-icon">🔒</div>
          <h3 className="creator-tips__lock-title">Creator Tips from Muslim Empire</h3>
          <p className="creator-tips__lock-subtitle">
            Exclusive upload strategies from a 300K+ subscriber Islamic channel available only for Premium members.
          </p>
          <button
            className="creator-tips__unlock-btn"
            onClick={() => window.dispatchEvent(new Event('openPricingModal'))}
          >
            ✦ Unlock with Premium
          </button>
        </div>
      </div>
    );
  }

  /* ─── Premium unlocked view ─── */
  return (
    <div className="creator-tips">
      {/* Header */}
      <div className="creator-tips__header">
        <img
          src="/muslim-empire-logo.jpg"
          alt="Muslim Empire"
          className="creator-tips__logo"
        />
        <span className="creator-tips__ornament">✦ ✦ ✦</span>
        <h2 className="creator-tips__title">Creator Tips from Muslim Empire</h2>
        <div className="creator-tips__channel-badge">
          <span className="creator-tips__badge-icon">▶</span>
          <span className="creator-tips__badge-text">Muslim Empire · 300K+ Subscribers</span>
          <span className="creator-tips__badge-verified">✓</span>
        </div>
        <p className="creator-tips__intro">
          These are my personal, daily-tested strategies for uploading Islamic Shorts on YouTube &amp; Instagram.
          These methods consistently help me reach <strong>50K+ views within 24 hours</strong>.
        </p>
        <div className="creator-tips__promise">
          <span className="creator-tips__promise-icon">🎯</span>
          <span>Grow faster · Reach more Islamic audiences · Improve video performance</span>
        </div>
      </div>

      <div className="creator-tips__divider" />

      <h3 className="creator-tips__section-label">
        ⚡ Premium Creator Tips for Viral Islamic Shorts
      </h3>

      {/* Tips Accordion */}
      <div className="creator-tips__list">
        {TIPS.map((tip, i) => {
          const open = expandedIdx === i;
          return (
            <div
              key={i}
              className={`creator-tip ${open ? 'creator-tip--open' : ''}`}
              onClick={() => toggle(i)}
            >
              <div className="creator-tip__head">
                <span className="creator-tip__icon">{tip.icon}</span>
                <span className="creator-tip__title">{tip.title}</span>
                <span className="creator-tip__chevron">{open ? '−' : '+'}</span>
              </div>
              {open && (
                <div className="creator-tip__body">
                  <p>{tip.body}</p>
                  {tip.tags && (
                    <div className="creator-tip__tags">
                      {tip.tags.map((t, j) => (
                        <span key={j} className="creator-tip__tag">{t}</span>
                      ))}
                    </div>
                  )}
                  {tip.tools && (
                    <div className="creator-tip__tools">
                      {tip.tools.map((tool, j) => (
                        <div key={j} className="creator-tip__tool-card">
                          <span className="creator-tip__tool-emoji">{tool.emoji}</span>
                          <div className="creator-tip__tool-info">
                            <span className="creator-tip__tool-name">{tool.name}</span>
                            <span className="creator-tip__tool-role">{tool.role}</span>
                            <span className="creator-tip__tool-desc">{tool.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {tip.extra && (
                    <div className="creator-tip__extra">
                      <span className="creator-tip__extra-icon">💡</span>
                      <span>{tip.extra}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="creator-tips__footer">
        <span className="creator-tips__footer-icon">☪</span>
        <span>Based on real creator experience not generic advice. May Allah bless your dawah efforts.</span>
      </div>
    </div>
  );
}
