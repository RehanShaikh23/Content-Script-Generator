import { useState, useEffect, useRef } from 'react';
import OptionGrid from './OptionGrid';
import ChipGroup from './ChipGroup';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api';
import {
  VIDEO_FORMATS,
  CATEGORIES,
  TONES,
} from '../constants';

export default function ScriptForm({ selectedScript, onScriptGenerated }) {
  const [topic, setTopic] = useState('');
  const [extra, setExtra] = useState('');
  const [videoFormat, setVideoFormat] = useState('shorts');
  const [category, setCategory] = useState('quran');
  const [tone, setTone] = useState('educational');
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(0);
  const intervalRef = useRef(null);
  const { token, credits, updateCredits } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const LOADING_MESSAGES = [
    'Seeking knowledge…',
    'Gathering wisdom from the Quran…',
    'Crafting with Barakah…',
    'Polishing the script…',
    'Adding final touches…',
  ];

  // Load script from history
  useEffect(() => {
    if (selectedScript) {
      setTopic(selectedScript.topic || '');
      setVideoFormat(selectedScript.videoFormat || 'shorts');
      setCategory(selectedScript.category || 'quran');
      setTone(selectedScript.tone || 'educational');
      setScript(selectedScript.script || '');
      onScriptGenerated?.();
    }
  }, [selectedScript]);

  const canGenerate = topic.trim().length > 0 && !isGenerating && credits > 0;

  async function handleGenerate() {
    if (credits <= 0) {
      setShowUpgrade(true);
      return;
    }
    if (!canGenerate) return;
    setShowUpgrade(false);
    setError('');
    setIsGenerating(true);
    setScript('');
    setLoadingMsg(0);

    // Start cycling loading messages
    intervalRef.current = setInterval(() => {
      setLoadingMsg(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2400);

    try {
      const data = await apiPost('/script/generate', {
        topic: topic.trim(),
        extra: extra.trim(),
        videoFormat,
        category,
        tone,
      }, token);

      setScript(data.script);
      if (data.remainingCredits !== undefined) {
        updateCredits(data.remainingCredits);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate script');
    } finally {
      clearInterval(intervalRef.current);
      setIsGenerating(false);
    }
  }

  return (
    <>
      <div className="card">
        {/* Topic */}
        <div className="field">
          <label className="field__label">Topic or Title</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. The Power of Istighfar, Story of Prophet Musa, Signs of Qiyamah…"
          />
        </div>

        {/* Additional Context */}
        <div className="field">
          <label className="field__label">
            Additional context{' '}
            <span className="field__label-hint">(optional)</span>
          </label>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Specific ayah, target audience, key points, language preference…"
          />
        </div>

        <div className="divider" />

        {/* Video Format */}
        <div className="field">
          <label className="field__label">Video Format</label>
          <OptionGrid
            options={VIDEO_FORMATS}
            columns={3}
            activeValue={videoFormat}
            onChange={setVideoFormat}
          />
        </div>

        {/* Content Category */}
        <div className="field">
          <label className="field__label">Content Category</label>
          <OptionGrid
            options={CATEGORIES}
            columns={4}
            activeValue={category}
            onChange={setCategory}
          />
        </div>

        {/* Tone & Style */}
        <div className="field">
          <label className="field__label">Tone &amp; Style</label>
          <ChipGroup
            options={TONES}
            activeValue={tone}
            onChange={setTone}
          />
        </div>

        {/* Upgrade Prompt */}
        {showUpgrade && (
          <div className="credit-upgrade-prompt">
            <div className="credit-upgrade-prompt__icon">⚡</div>
            <p className="credit-upgrade-prompt__text">
              You've used all your free credits! Upgrade your plan to continue generating Islamic content.
            </p>
            <button
              className="credit-upgrade-prompt__btn"
              onClick={() => {
                setShowUpgrade(false);
                // Dispatch custom event to open pricing modal
                window.dispatchEvent(new Event('openPricingModal'));
              }}
            >
              ✦ Upgrade Now
            </button>
          </div>
        )}

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Generate Button */}
        {isGenerating ? (
          <div className="ai-loading">
            <div className="ai-loading__dots">
              <span /><span /><span />
            </div>
            <p className="ai-loading__text" key={loadingMsg}>
              {LOADING_MESSAGES[loadingMsg]}
            </p>
          </div>
        ) : (
          <button
            className="generate-btn"
            disabled={!canGenerate}
            onClick={handleGenerate}
          >
            ✦ Generate Script ✦
          </button>
        )}
      </div>

      {/* Generated Script Output */}
      {script && (
        <div className="card script-output">
          <div className="script-output__header">
            <label className="field__label">Generated Script</label>
            <button
              className="script-output__copy"
              onClick={() => navigator.clipboard.writeText(script)}
            >
              📋 Copy
            </button>
          </div>
          <div className="divider" />
          <div
            className="script-output__content"
            dangerouslySetInnerHTML={{ __html: formatScript(script) }}
          />
        </div>
      )}
    </>
  );
}

function formatScript(text) {
  return text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Bullet points: * item or - item at start of line
    .replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    // Numbered lists: 1. item
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, (match) => {
      // If not already wrapped in <ul>, wrap in <ol>
      if (!match.startsWith('<ul>')) return `<ol>${match}</ol>`;
      return match;
    })
    // Timestamps in parens: (0s-5s) or (5s-15s) — style as labels
    .replace(/\((\d+s?-\d+s?)\)/g, '<span class="script-timestamp">$1</span>')
    // Line breaks to paragraphs
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // Don't wrap blocks that are already HTML elements
      if (trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>')) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');
}
