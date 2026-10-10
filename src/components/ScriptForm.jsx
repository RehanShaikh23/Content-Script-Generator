import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ScriptComposer from './studio/ScriptComposer';
import { SampleScript } from './studio/StudioSample';
import { Sparkle, FileText, ArrowRight } from '@phosphor-icons/react';


import DhikrOverlay from './DhikrOverlay';
import VisualSceneControls from './VisualSceneControls';
import VisualScenePanel from './VisualScenePanel';
import { useAuth } from '../context/AuthContext';
import { useVisualScenes } from '../hooks/useVisualScenes';
import { apiStream, apiDownload } from '../api';

export default function ScriptForm({ selectedScript, onScriptGenerated, workspaceTab = 'script', onWorkspaceTab, preview = false }) {
  const [topic, setTopic] = useState('');
  const [extra, setExtra] = useState('');
  const [videoFormat, setVideoFormat] = useState('shorts');
  const [category, setCategory] = useState('quran');
  const [tone, setTone] = useState('educational');
  const [customTone, setCustomTone] = useState('');
  const [language, setLanguage] = useState('english');
  const [selectedModel, setSelectedModel] = useState('default');
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
  const [previewNotice, setPreviewNotice] = useState('');

  // ── Visual Scene Agent ──
  const visualScenes = useVisualScenes(token);

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
  }, [selectedScript, onScriptGenerated]);

  // Premium users always can generate; free users need credits + topic
  const canGenerate = topic.trim().length > 0 && !isGenerating && (preview || isPremium || credits > 0);

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
    if (preview) { setPreviewNotice('This is a design preview. Sign in to generate your own script.'); return; }
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

    // Reset visual scenes when starting a new generation
    visualScenes.reset();
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
      model: selectedModel,
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
  }, [preview, canGenerate, isPremium, credits, topic, extra, videoFormat, category, tone, customTone, language, selectedModel, token, abortStream, updateCredits, visualScenes, LOADING_MESSAGES.length]);

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

  return (
    <>
      {/* Dhikr Focus Break Overlay */}
      <DhikrOverlay
        isActive={showDhikr}
        onComplete={handleDhikrComplete}
        streamProgress={streamProgress}
        isStreamDone={doneStreamingRef.current}
      />
      <div className="studio-tabs" role="tablist" aria-label="Creation tools" onKeyDown={event => {
        const tabs = ['script', 'visuals', 'prompts'];
        const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!direction && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'script' : event.key === 'End' ? 'prompts' : tabs[(tabs.indexOf(workspaceTab) + direction + tabs.length) % tabs.length];
        onWorkspaceTab?.(next);
        document.getElementById(`tab-${next}`)?.focus();
      }}>
        { [['script','Script'],['visuals','Visual Scenes'],['prompts','AI Video Prompts']].map(([id,label]) => <button key={id} role="tab" tabIndex={workspaceTab===id?0:-1} id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={workspaceTab===id} className={workspaceTab===id?'is-active':''} onClick={()=>onWorkspaceTab?.(id)}>{label}</button>) }
      </div>
      <section role="tabpanel" id="panel-script" aria-labelledby="tab-script" hidden={workspaceTab !== 'script'}>
      <ScriptComposer topic={topic} setTopic={setTopic} extra={extra} setExtra={setExtra} videoFormat={videoFormat} setVideoFormat={setVideoFormat} category={category} setCategory={setCategory} tone={tone} setTone={setTone} language={language} setLanguage={setLanguage} selectedModel={selectedModel} setSelectedModel={setSelectedModel} customTone={customTone} setCustomTone={setCustomTone} isPremium={isPremium}>
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
        {error && <div className="auth-error" role="alert">{error}</div>}
        {previewNotice && <p className="studio-inline-notice" role="status">{previewNotice}</p>}

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
              Generate Script <Sparkle size={18} weight="fill" />
            </button>
          </div>
        )}
      </ScriptComposer>
      {!script && !isStreaming && <section className="studio-example-result"><header><h2>Your next story starts here</h2><span>Example script</span></header><SampleScript onTry={() => setTopic('Small habits for a more meaningful morning')} /></section>}
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

      </section>
      <section role="tabpanel" id={`panel-${workspaceTab==='prompts'?'prompts':'visuals'}`} aria-labelledby={`tab-${workspaceTab==='prompts'?'prompts':'visuals'}`} hidden={workspaceTab==='script'}>
      {!script && <div className="studio-visual-empty"><img src="/images/morning-routine.png" alt="Example of a cinematic morning scene"/><div><span className="creator-eyebrow">YOUR STORY, SCENE BY SCENE</span><h2>Give your words a world.</h2><p>Generate or open a saved script first. Then get camera directions, AI video prompts, and clip-search suggestions for every scene.</p><button className="studio-btn studio-btn--dark" onClick={()=>onWorkspaceTab?.('script')}><FileText/> Create a script <ArrowRight/></button></div></div>}
      {/* ── Visual Scene Agent ── */}
      {script && !isStreaming && !isGenerating && (
        <>
          {/* Visual Controls — style/aspect/duration selectors */}
          <VisualSceneControls
            settings={visualScenes.visualSettings}
            onUpdateSetting={visualScenes.updateSetting}
            onGenerate={() => visualScenes.startVisualGeneration(script, topic, category, videoFormat)}
            isProcessing={visualScenes.isProcessing}
            isProfileLoading={visualScenes.isProfileLoading}
            scenesCount={visualScenes.scenes.length > 0
              ? visualScenes.scenes.length
              : Math.max(1, Math.min(script.split(/\n\s*\n/).filter(b => b.trim()).length, 20))
            }
          />

          {/* Scene Panels — one per detected scene */}
          {visualScenes.error && <p role="alert">{visualScenes.error}</p>}
          {visualScenes.scenes.length > 0 && (
            <div className="card visual-scenes-list">
              <div className="visual-scenes-list__header">
                <h3 className="visual-scenes-list__title">
                  Visual Direction — {visualScenes.scenes.length} Scenes
                </h3>
                {visualScenes.isProcessing && (
                  <button
                    className="visual-scenes-list__cancel"
                    onClick={visualScenes.cancelGeneration}
                  >
                    ■ Cancel
                  </button>
                )}
              </div>
              {visualScenes.scenes.map((scene) => (
                <VisualScenePanel
                  key={scene.sceneId}
                  scene={scene}
                  state={visualScenes.sceneStates[scene.sceneId]}
                  onRetry={visualScenes.retryScene}
                  onRegenerate={visualScenes.regenerateScene}
                />
              ))}
            </div>
          )}
        </>
      )}
      </section>
    </>
  );
}

function formatScript(text) {
  return text
    // ── Strip unwanted markdown / formatting artifacts ──
    .replace(/^#{1,6}\s*/gm, '')       // ## headings → plain text
    .replace(/^---+$/gm, '')           // --- horizontal rules
    .replace(/^___+$/gm, '')           // ___ horizontal rules
    .replace(/--+/g, ' ')              // -- double dashes → space
    .replace(/—/g, ' ')               // em dash → space
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Bullet points: * item or - item at start of line
    .replace(/^[*-]\s+(.+)$/gm, '<li>$1</li>')
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
