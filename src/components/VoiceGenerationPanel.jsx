import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api';
import { Microphone, CurrencyInr, Lightning, Play, Pause, DownloadSimple, ArrowClockwise, CaretDown, SpeakerHigh, Warning, CheckCircle, CircleNotch, Lock, ShoppingCart } from '@phosphor-icons/react';

const API_BASE = import.meta.env?.VITE_API_BASE || 'http://localhost:8082/api';

/**
 * VoiceGenerationPanel — Premium voice generation add-on.
 * Displays voice/model selection, credit balance, generation controls,
 * audio player, and generation history.
 */
export default function VoiceGenerationPanel({ script, scriptHistoryId }) {
  const { token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [hasVoicePack, setHasVoicePack] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);

  // Voice & Model
  const [voices, setVoices] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [selectedModel, setSelectedModel] = useState('eleven_multilingual_v2');

  // Generation
  const [estimatedCredits, setEstimatedCredits] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationId, setGenerationId] = useState(null);
  const [generationStatus, setGenerationStatus] = useState(null);
  const [generationError, setGenerationError] = useState('');

  // Audio
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // History
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Checkout
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Loading states
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const pollRef = useRef(null);

  // ── Fetch balance ──
  const fetchBalance = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiGet('/voice/balance', token);
      setBalance(data.balance);
      setHasVoicePack(data.hasVoicePack);
      setFeatureEnabled(data.featureEnabled);
    } catch (e) {
      console.error('Failed to fetch voice balance:', e);
    } finally {
      setLoadingBalance(false);
    }
  }, [token]);

  // ── Fetch voices & models ──
  const fetchVoicesAndModels = useCallback(async () => {
    if (!token) return;
    try {
      const [vData, mData] = await Promise.all([
        apiGet('/voice/voices', token),
        apiGet('/voice/models', token),
      ]);
      setVoices(vData.voices || []);
      setModels(mData.models || []);
      if (vData.voices?.length > 0 && !selectedVoice) {
        setSelectedVoice(vData.voices[0].voiceId);
      }
    } catch (e) {
      console.error('Failed to fetch voices:', e);
    } finally {
      setLoadingVoices(false);
    }
  }, [token, selectedVoice]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);
  useEffect(() => { fetchVoicesAndModels(); }, [fetchVoicesAndModels]);

  // ── Cleanup blob URL on unmount ──
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // ── Estimate credits when script/model changes ──
  useEffect(() => {
    if (!script || !token) { setEstimatedCredits(0); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await apiPost('/voice/estimate', { text: script, modelId: selectedModel }, token);
        setEstimatedCredits(data.estimatedCredits);
      } catch { /* ignore */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [script, selectedModel, token]);

  // ── Poll generation status ──
  useEffect(() => {
    if (!generationId || generationStatus === 'COMPLETED' || generationStatus === 'FAILED') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const data = await apiGet(`/voice/generation/${generationId}`, token);
        setGenerationStatus(data.status);
        if (data.status === 'COMPLETED') {
          setIsGenerating(false);
          // Fetch audio as blob with auth header (audio element can't send JWT)
          const blobUrl = await fetchAudioBlob(generationId);
          if (blobUrl) setAudioUrl(blobUrl);
          fetchBalance();
          fetchHistory();
        } else if (data.status === 'FAILED') {
          setIsGenerating(false);
          setGenerationError(data.error || 'Generation failed');
          fetchBalance();
        }
      } catch { /* ignore */ }
    }, 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [generationId, generationStatus, token, fetchAudioBlob]);

  // ── Fetch history ──
  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiGet('/voice/history', token);
      setHistory(data.generations || []);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { if (hasVoicePack) fetchHistory(); }, [hasVoicePack, fetchHistory]);

  // ── Generate voice ──
  const handleGenerate = async () => {
    if (!script || isGenerating) return;

    setIsGenerating(true);
    setGenerationError('');
    setGenerationStatus('PENDING');
    setAudioUrl(null);
    setIsPlaying(false);

    try {
      const data = await apiPost('/voice/generate', {
        text: script,
        voiceId: selectedVoice,
        modelId: selectedModel,
        scriptHistoryId: scriptHistoryId || undefined,
      }, token);

      if (data.success) {
        setGenerationId(data.generationId);
        setGenerationStatus(data.status);
      } else {
        setIsGenerating(false);
        setGenerationError(data.error || 'Failed to start generation');
        if (data.balance !== undefined) setBalance(data.balance);
      }
    } catch (e) {
      setIsGenerating(false);
      setGenerationError(e.message || 'Failed to start generation');
    }
  };

  // ── Checkout ──
  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const data = await apiPost('/voice/checkout', {}, token);
      if (data.success && data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
      } else {
        setGenerationError(data.error || 'Failed to create checkout');
      }
    } catch (e) {
      setGenerationError(e.message || 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // ── Audio controls ──
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!generationId) return;
    const link = document.createElement('a');
    link.href = `${API_BASE}/voice/audio/${generationId}/download`;
    link.setAttribute('download', `islamic-voice-${generationId}.mp3`);
    // Add auth header via fetch
    fetch(`${API_BASE}/voice/audio/${generationId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  // ── Fetch audio as blob with auth ──
  const fetchAudioBlob = useCallback(async (genId) => {
    try {
      const res = await fetch(`${API_BASE}/voice/audio/${genId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load audio');
      const blob = await res.blob();
      // Revoke previous blob URL to avoid memory leaks
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error('Failed to fetch audio:', e);
      setGenerationError('Failed to load audio. Please try again.');
      return null;
    }
  }, [token, audioUrl]);

  // ── Play history item ──
  const playHistoryItem = async (genId) => {
    setGenerationId(genId);
    setGenerationStatus('COMPLETED');
    setIsPlaying(false);
    const blobUrl = await fetchAudioBlob(genId);
    if (blobUrl) setAudioUrl(blobUrl);
  };

  if (!featureEnabled) return null;

  // ── Locked state: no voice pack ──
  if (!hasVoicePack && !loadingBalance) {
    return (
      <div className="voice-panel voice-panel--locked">
        <div className="voice-panel__header">
          <SpeakerHigh size={20} weight="fill" />
          <h3>AI Voice Narration</h3>
          <span className="voice-panel__badge voice-panel__badge--premium">Premium Add-on</span>
        </div>

        <div className="voice-panel__lock-content">
          <div className="voice-panel__lock-icon">
            <Lock size={32} weight="fill" />
          </div>
          <h4>Transform Your Scripts into Professional Audio</h4>
          <p>
            Get natural-sounding AI narration powered by ElevenLabs with support for Arabic,
            Urdu, and multilingual Islamic content.
          </p>

          <div className="voice-panel__credits-info">
            <div className="voice-panel__credits-highlight">
              <Lightning size={18} weight="fill" />
              <span><strong>10,000</strong> voice credits</span>
            </div>
            <ul>
              <li>1 credit ≈ 1 character of narration</li>
              <li>Multiple voices for different styles</li>
              <li>Arabic & multilingual support</li>
              <li>Download MP3 audio files</li>
            </ul>
          </div>

          <button
            className="voice-panel__buy-btn"
            onClick={handleCheckout}
            disabled={isCheckingOut}
          >
            {isCheckingOut ? (
              <><CircleNotch size={18} className="spin" /> Processing...</>
            ) : (
              <><ShoppingCart size={18} /> Buy Voice Pack — ₹800</>
            )}
          </button>
          <p className="voice-panel__buy-note">One-time purchase · No subscription needed</p>
        </div>

        {generationError && (
          <div className="voice-panel__error" role="alert">
            <Warning size={16} /> {generationError}
          </div>
        )}
      </div>
    );
  }

  if (loadingBalance || loadingVoices) {
    return (
      <div className="voice-panel voice-panel--loading">
        <div className="voice-panel__header">
          <SpeakerHigh size={20} weight="fill" />
          <h3>AI Voice Narration</h3>
        </div>
        <div className="voice-panel__loading">
          <CircleNotch size={24} className="spin" />
          <span>Loading voice features...</span>
        </div>
      </div>
    );
  }

  // ── Active state: has voice credits ──
  return (
    <div className="voice-panel">
      <div className="voice-panel__header">
        <SpeakerHigh size={20} weight="fill" />
        <h3>AI Voice Narration</h3>
        <span className="voice-panel__balance">
          <Lightning size={14} weight="fill" />
          {balance.toLocaleString()} credits
        </span>
      </div>

      {/* Voice Selection */}
      <div className="voice-panel__controls">
        <div className="voice-panel__field">
          <label>Voice</label>
          <div className="voice-panel__select-wrap">
            <select
              value={selectedVoice}
              onChange={e => setSelectedVoice(e.target.value)}
              disabled={isGenerating}
            >
              {voices.map(v => (
                <option key={v.voiceId} value={v.voiceId}>
                  {v.name} ({v.gender}) — {v.description}
                </option>
              ))}
            </select>
            <CaretDown size={14} className="voice-panel__select-icon" />
          </div>
        </div>

        <div className="voice-panel__field">
          <label>Model</label>
          <div className="voice-panel__select-wrap">
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              disabled={isGenerating}
            >
              {models.map(m => (
                <option key={m.modelId} value={m.modelId}>
                  {m.name} — {m.description}
                </option>
              ))}
            </select>
            <CaretDown size={14} className="voice-panel__select-icon" />
          </div>
        </div>
      </div>

      {/* Credit Estimate */}
      {script && estimatedCredits > 0 && (
        <div className="voice-panel__estimate">
          <span>Estimated usage: <strong>{estimatedCredits.toLocaleString()}</strong> credits</span>
          {balance < estimatedCredits && (
            <span className="voice-panel__insufficient">
              <Warning size={14} /> Insufficient credits
            </span>
          )}
        </div>
      )}

      {/* Generate Button */}
      <div className="voice-panel__actions">
        <button
          className="voice-panel__generate-btn"
          onClick={handleGenerate}
          disabled={!script || isGenerating || balance < estimatedCredits}
        >
          {isGenerating ? (
            <><CircleNotch size={18} className="spin" /> Generating...</>
          ) : (
            <><Microphone size={18} weight="fill" /> Generate Voice</>
          )}
        </button>

        {balance < estimatedCredits && balance > 0 && (
          <button
            className="voice-panel__rebuy-btn"
            onClick={handleCheckout}
            disabled={isCheckingOut}
          >
            {isCheckingOut ? 'Processing...' : 'Buy More Credits — ₹800'}
          </button>
        )}
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <div className="voice-panel__progress">
          <div className="voice-panel__progress-bar">
            <div
              className="voice-panel__progress-fill"
              style={{ width: generationStatus === 'PROCESSING' ? '60%' : '30%' }}
            />
          </div>
          <span>
            {generationStatus === 'PROCESSING'
              ? 'Generating audio with ElevenLabs...'
              : 'Preparing voice generation...'}
          </span>
        </div>
      )}

      {/* Error */}
      {generationError && (
        <div className="voice-panel__error" role="alert">
          <Warning size={16} /> {generationError}
          <button onClick={() => setGenerationError('')}>✕</button>
        </div>
      )}

      {/* Audio Player */}
      {audioUrl && generationStatus === 'COMPLETED' && (
        <div className="voice-panel__player">
          <div className="voice-panel__player-status">
            <CheckCircle size={16} weight="fill" />
            <span>Audio ready</span>
          </div>
          <audio
            ref={audioRef}
            src={audioUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            preload="auto"
          />
          <div className="voice-panel__player-controls">
            <button
              className="voice-panel__play-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
            </button>
            <button
              className="voice-panel__download-btn"
              onClick={handleDownload}
              aria-label="Download audio"
            >
              <DownloadSimple size={18} /> Download MP3
            </button>
          </div>
        </div>
      )}

      {/* History Toggle */}
      {history.length > 0 && (
        <div className="voice-panel__history">
          <button
            className="voice-panel__history-toggle"
            onClick={() => setShowHistory(!showHistory)}
          >
            <ArrowClockwise size={16} />
            Generation History ({history.length})
            <CaretDown
              size={12}
              style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </button>

          {showHistory && (
            <div className="voice-panel__history-list">
              {history.map(gen => (
                <div key={gen.generationId} className="voice-panel__history-item">
                  <div className="voice-panel__history-meta">
                    <span className={`voice-panel__status voice-panel__status--${gen.status.toLowerCase()}`}>
                      {gen.status}
                    </span>
                    <span className="voice-panel__history-date">
                      {gen.createdAt ? new Date(gen.createdAt).toLocaleDateString() : ''}
                    </span>
                    <span className="voice-panel__history-credits">
                      {gen.actualCredits || gen.estimatedCredits} credits
                    </span>
                  </div>
                  <p className="voice-panel__history-text">{gen.textPreview}</p>
                  {gen.audioAvailable && (
                    <button
                      className="voice-panel__history-play"
                      onClick={() => playHistoryItem(gen.generationId)}
                    >
                      <Play size={14} weight="fill" /> Play
                    </button>
                  )}
                  {gen.error && (
                    <span className="voice-panel__history-error">{gen.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

