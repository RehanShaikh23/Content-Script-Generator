import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import OptionGrid from './OptionGrid';
import ChipGroup from './ChipGroup';
import DhikrOverlay from './DhikrOverlay';
import { useAuth } from '../context/AuthContext';
import { apiStream, apiPost, apiDownload } from '../api';
import {
  VIDEO_FORMATS,
  CATEGORIES,
  TONES,
  LANGUAGES,
} from '../constants';

export default function ScriptForm({ selectedScript, onScriptGenerated }) {
  const [topic, setTopic] = useState('');
  const [extra, setExtra] = useState('');
  const [videoFormat, setVideoFormat] = useState('shorts');
  const [category, setCategory] = useState('quran');
  const [tone, setTone] = useState('educational');
  const [customTone, setCustomTone] = useState('');
  const [language, setLanguage] = useState('english');
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [exporting, setExporting] = useState(null); // 'pdf' | 'docx' | null
  const [showDhikr, setShowDhikr] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0); // word count during stream
  const [fromCache, setFromCache] = useState(false);
  const intervalRef = useRef(null);
  const streamControllerRef = useRef(null);
  const streamedScriptRef = useRef(''); // accumulates streamed text during dhikr
  const doneStreamingRef = useRef(false);
  const showDhikrRef = useRef(false);
  const { token, credits, updateCredits, isPremium } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const LOADING_MESSAGES = isPremium
    ? [
        'Seeking deep knowledge…',
        'Consulting scholarly sources…',
        'Crafting premium content with Barakah…',
        'Adding scholarly references…',
        'Polishing with precision…',
      ]
    : [
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

  // Premium users always can generate; free users need credits + topic
  const canGenerate = topic.trim().length > 0 && !isGenerating && (isPremium || credits > 0);

  // Filter options based on premium status
  const availableFormats = VIDEO_FORMATS.filter(f => !f.premium || isPremium);
  const availableTones = TONES.filter(t => !t.premium || isPremium);
  const availableLanguages = LANGUAGES.filter(l => !l.premium || isPremium);

  // Memoize formatted script to avoid re-computing on every render
  const formattedScript = useMemo(() => {
    if (!script) return '';
    return formatScript(script);
  }, [script]);

  // Stop any in-flight stream
  const abortStream = useCallback(() => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortStream();
      clearInterval(intervalRef.current);
    };
  }, [abortStream]);

  const handleGenerate = useCallback(() => {
    if (!isPremium && credits <= 0) {
      setShowUpgrade(true);
      return;
    }
    if (!canGenerate) return;

    // Abort any previous stream
    abortStream();

    setShowUpgrade(false);
    setError('');
    setIsGenerating(true);
    setIsStreaming(false);
    setScript('');
    setStreamProgress(0);
    setFromCache(false);
    setLoadingMsg(0);
    streamedScriptRef.current = '';
    doneStreamingRef.current = false;

    // Start cycling loading messages
    intervalRef.current = setInterval(() => {
      setLoadingMsg(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2400);

    // Start Dhikr overlay concurrently with streaming
    showDhikrRef.current = true;
    setShowDhikr(true);

    const body = {
      topic: topic.trim(),
      extra: extra.trim(),
      videoFormat,
      category,
      tone: tone === 'custom' ? 'custom' : tone,
    };

    if (tone === 'custom' && customTone.trim()) {
      body.customTone = customTone.trim();
    }

    if (isPremium && language && language !== 'english') {
      body.language = language;
    }

    // Use streaming endpoint
    const controller = apiStream('/script/generate/stream', body, token, {
      onChunk: (text) => {
        streamedScriptRef.current += text;
        setStreamProgress(prev => prev + 1);
        // If Dhikr is already done, render live
        if (!showDhikrRef.current) {
          setScript(streamedScriptRef.current);
          setIsStreaming(true);
        }
      },
      onCached: (text) => {
        streamedScriptRef.current = text;
        setFromCache(true);
        doneStreamingRef.current = true;
        // Cached scripts arrive instantly — Dhikr will reveal them
      },
      onMeta: (data) => {
        if (data.remainingCredits !== undefined && !isPremium) {
          updateCredits(data.remainingCredits);
        }
      },
      onDone: () => {
        doneStreamingRef.current = true;
        clearInterval(intervalRef.current);
        // If Dhikr already finished, finalize
        if (!showDhikrRef.current) {
          setScript(streamedScriptRef.current);
          setIsStreaming(false);
          setIsGenerating(false);
        }
      },
      onError: (err) => {
        setError(err.message || 'Failed to generate script');
        clearInterval(intervalRef.current);
        setIsGenerating(false);
        setIsStreaming(false);
        showDhikrRef.current = false;
        setShowDhikr(false);
      },
    });

    streamControllerRef.current = controller;
  }, [canGenerate, isPremium, credits, topic, extra, videoFormat, category, tone, customTone, language, token, abortStream, updateCredits]);

  // Stop generation mid-stream
  const handleStopGeneration = useCallback(() => {
    abortStream();
    doneStreamingRef.current = true;
    clearInterval(intervalRef.current);
    if (streamedScriptRef.current) {
      setScript(streamedScriptRef.current);
    }
    setIsStreaming(false);
    setIsGenerating(false);
    showDhikrRef.current = false;
    setShowDhikr(false);
  }, [abortStream]);

  async function handleExport(format) {
    if (!script || exporting) return;

    setExporting(format);
    try {
      const blob = await apiDownload(`/script/export/${format}`, {
        title: topic || 'Islamic Script',
        script,
        language: language || 'english',
      }, token);

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(topic || 'script').replace(/[^a-zA-Z0-9 -]/g, '').trim().replace(/ /g, '_')}.${format === 'pdf' ? 'pdf' : 'docx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || `Failed to export as ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  }

  // Dhikr completed — reveal the script with typewriter effect
  function handleDhikrComplete() {
    showDhikrRef.current = false;
    setShowDhikr(false);

    if (doneStreamingRef.current) {
      // Stream already finished during Dhikr — show full script instantly
      setScript(streamedScriptRef.current);
      setIsStreaming(false);
      setIsGenerating(false);
    } else {
      // Stream still in progress — start showing live
      setScript(streamedScriptRef.current);
      setIsStreaming(true);
    }
  }

  // Keep script updated when streaming continues after Dhikr
  useEffect(() => {
    if (!showDhikr && isStreaming) {
      const liveInterval = setInterval(() => {
        setScript(streamedScriptRef.current);
        if (doneStreamingRef.current) {
          setScript(streamedScriptRef.current);
          setIsStreaming(false);
          setIsGenerating(false);
          clearInterval(liveInterval);
        }
      }, 80); // Update ~12fps for smooth typewriter feel
      return () => clearInterval(liveInterval);
    }
  }, [showDhikr, isStreaming]);

  // Debounced topic setter (300ms)
  const topicTimeoutRef = useRef(null);
  function handleTopicChange(e) {
    const val = e.target.value;
    clearTimeout(topicTimeoutRef.current);
    topicTimeoutRef.current = setTimeout(() => {
      setTopic(val);
    }, 150);
    // Immediately update input value via uncontrolled pattern
    e.target.value = val;
  }

  return (
    <>
      {/* Dhikr Focus Break Overlay */}
      <DhikrOverlay
        isActive={showDhikr}
        onComplete={handleDhikrComplete}
        streamProgress={streamProgress}
        isStreamDone={doneStreamingRef.current}
      />
      <div className="card">
        {/* Topic */}
        <div className="field">
          <label className="field__label">Topic or Title</label>
          <input
            defaultValue={topic}
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
          <label className="field__label">
            Video Format
            {!isPremium && <span className="field__label-hint"> — some formats require Premium</span>}
          </label>
          <OptionGrid
            options={availableFormats}
            columns={availableFormats.length <= 3 ? 3 : 4}
            activeValue={videoFormat}
            onChange={setVideoFormat}
          />
          {!isPremium && (
            <div className="premium-locked-hint">
              🔒 Reels & Long-form formats available with Premium
            </div>
          )}
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
          <label className="field__label">
            Tone &amp; Style
            {!isPremium && <span className="field__label-hint"> — premium tones available with upgrade</span>}
          </label>
          <ChipGroup
            options={availableTones}
            activeValue={tone}
            onChange={(val) => {
              setTone(val);
              if (val !== 'custom') setCustomTone('');
            }}
          />

          {/* Custom Tone Input — premium only */}
          {tone === 'custom' && isPremium && (
            <div className="custom-tone-field">
              <input
                className="custom-tone-input"
                value={customTone}
                onChange={(e) => setCustomTone(e.target.value)}
                placeholder="Describe your tone, e.g. 'Warm and conversational, like talking to a friend'"
                maxLength={200}
              />
            </div>
          )}
        </div>

        {/* Language — premium multi-language */}
        {isPremium && (
          <div className="field">
            <label className="field__label">
              🌍 Script Language
              <span className="field__label-hint"> — Premium multi-language</span>
            </label>
            <ChipGroup
              options={availableLanguages}
              activeValue={language}
              onChange={setLanguage}
            />
            {language !== 'english' && (
              <div className="language-note">
                ✦ Script will be generated in {LANGUAGES.find(l => l.value === language)?.label || language}.
                Quranic ayat will remain in Arabic with transliteration.
                <br />
                <span className="language-note__tip">💡 For non-Latin scripts (Arabic, Urdu, Hindi, Bangla), use DOCX export for best formatting.</span>
              </div>
            )}
          </div>
        )}
        {!isPremium && (
          <div className="premium-locked-hint">
            🌍 Multi-language scripts available with Premium
          </div>
        )}

        {/* Upgrade Prompt — only shown for free users */}
        {!isPremium && showUpgrade && (
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
        {isGenerating && !isStreaming ? (
          <div className="ai-loading">
            <div className="ai-loading__dots">
              <span /><span /><span />
            </div>
            <p className="ai-loading__text" key={loadingMsg}>
              {LOADING_MESSAGES[loadingMsg]}
            </p>
          </div>
        ) : (
          <div className="generate-btn-wrap">
            <button
              className="generate-btn"
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
              {isPremium ? ' Generate Premium Script ✍️' : '✦ Generate Script ✦'}
            </button>
          </div>
        )}
      </div>

      {/* Generated Script Output */}
      {(script || isStreaming) && (
        <div className={`card script-output ${isStreaming ? 'script-output--streaming' : ''}`}>
          <div className="script-output__header">
            <label className="field__label">
              Generated Script
              {fromCache && <span className="script-output__cache-badge">⚡ Instant</span>}
            </label>
            <div className="script-output__actions-bar">
              {isStreaming && (
                <button
                  className="script-output__stop-btn"
                  onClick={handleStopGeneration}
                  title="Stop generation"
                >
                  ■ Stop
                </button>
              )}
              <button
                className="script-output__copy"
                onClick={() => navigator.clipboard.writeText(script)}
                disabled={isStreaming}
              >
                📋 Copy
              </button>
            </div>
          </div>

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="script-output__streaming-indicator">
              <span className="streaming-badge">
                <span className="streaming-badge__dot" />
                Generating…
              </span>
              <span className="streaming-badge__words">
                {script.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
          )}

          <div className="divider" />
          <div className="script-output__content-wrap">
            <div
              className={`script-output__content ${isStreaming ? 'script-output__content--streaming' : ''}`}
              dangerouslySetInnerHTML={{ __html: formattedScript }}
            />
            {isStreaming && <span className="script-output__cursor" />}
          </div>

          {/* Export Buttons — Premium Only, shown when not streaming */}
          {isPremium && !isStreaming && script && (
            <div className="script-output__export-bar">
              <span className="export-bar__label">✦ Premium Export</span>
              <div className="export-bar__buttons">
                <button
                  className="export-btn export-btn--pdf"
                  onClick={() => handleExport('pdf')}
                  disabled={!!exporting}
                >
                  {exporting === 'pdf' ? '⏳ Exporting…' : '📄 Export PDF'}
                </button>
                <button
                  className="export-btn export-btn--docx"
                  onClick={() => handleExport('docx')}
                  disabled={!!exporting}
                >
                  {exporting === 'docx' ? '⏳ Exporting…' : '📝 Export DOCX'}
                </button>
              </div>
            </div>
          )}
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
