import { useState, useCallback } from 'react';
import { SEARCH_URL_BUILDERS } from '../constants';

/**
 * Collapsible visual direction panel for a single scene.
 * Shows: AI prompt, negative prompt, camera, visual direction,
 * generator recommendations, search queries with clickable links.
 */
export default function VisualScenePanel({ scene, state, onRetry, onRegenerate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch { /* ignore */ }
  }, []);

  const statusIcon = {
    queued: '⏸',
    generating: '⏳',
    completed: '✅',
    failed: '❌',
    cancelled: '⚠️',
  };

  const statusLabel = {
    queued: 'Queued',
    generating: 'Generating…',
    completed: 'Ready',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  const status = state?.status || 'queued';
  const data = state?.data || null;

  return (
    <div className={`vsp ${status === 'generating' ? 'vsp--generating' : ''}`}>
      {/* Header — always visible */}
      <button
        className="vsp__header"
        onClick={() => status === 'completed' && setIsExpanded(!isExpanded)}
        disabled={status !== 'completed'}
        aria-expanded={isExpanded}
      >
        <div className="vsp__header-left">
          <span className="vsp__number">Scene {scene.sceneNumber}</span>
          <span className="vsp__title">{scene.title}</span>
        </div>
        <div className="vsp__header-right">
          <span className={`vsp__status vsp__status--${status}`}>
            {statusIcon[status]} {statusLabel[status]}
          </span>
          {status === 'completed' && (
            <span className="vsp__chevron">{isExpanded ? '▾' : '▸'}</span>
          )}
        </div>
      </button>

      {/* Generating indicator */}
      {status === 'generating' && (
        <div className="vsp__loading">
          <div className="vsp__loading-bar" />
        </div>
      )}

      {/* Failed state with retry */}
      {(status === 'failed' || status === 'cancelled') && (
        <div className="vsp__error">
          <span className="vsp__error-text">
            {state?.error || 'Visual direction unavailable.'}
          </span>
          <button className="vsp__retry-btn" onClick={() => onRetry(scene.sceneId)}>
            🔄 Retry
          </button>
        </div>
      )}

      {/* Expanded content — visual direction details */}
      {isExpanded && data && (
        <div className="vsp__content">
          {/* AI Video Prompt */}
          <div className="vsp__section">
            <div className="vsp__section-header">
              <h4 className="vsp__section-title">AI Video Prompt</h4>
              <button
                className="vsp__copy-btn"
                onClick={() => handleCopy(data.visualPrompt, 'prompt')}
              >
                {copiedField === 'prompt' ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <div className="vsp__prompt-box">{data.visualPrompt}</div>
          </div>

          {/* Negative Prompt */}
          {data.negativePrompt && (
            <div className="vsp__section">
              <div className="vsp__section-header">
                <h4 className="vsp__section-title">Negative Prompt</h4>
                <button
                  className="vsp__copy-btn"
                  onClick={() => handleCopy(data.negativePrompt, 'negative')}
                >
                  {copiedField === 'negative' ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <div className="vsp__prompt-box vsp__prompt-box--negative">{data.negativePrompt}</div>
            </div>
          )}

          {/* Camera Direction */}
          {data.camera && (
            <div className="vsp__section">
              <h4 className="vsp__section-title">📷 Camera Direction</h4>
              <div className="vsp__meta-grid">
                {data.camera.shot && <MetaItem label="Shot" value={data.camera.shot} />}
                {data.camera.movement && <MetaItem label="Movement" value={data.camera.movement} />}
                {data.camera.lens && <MetaItem label="Lens" value={data.camera.lens} />}
                {data.camera.composition && <MetaItem label="Composition" value={data.camera.composition} />}
              </div>
            </div>
          )}

          {/* Visual Direction */}
          {data.visualDirection && (
            <div className="vsp__section">
              <h4 className="vsp__section-title">🎨 Visual Direction</h4>
              <div className="vsp__meta-grid">
                {data.visualDirection.subject && <MetaItem label="Subject" value={data.visualDirection.subject} />}
                {data.visualDirection.action && <MetaItem label="Action" value={data.visualDirection.action} />}
                {data.visualDirection.environment && <MetaItem label="Environment" value={data.visualDirection.environment} />}
                {data.visualDirection.mood && <MetaItem label="Mood" value={data.visualDirection.mood} />}
                {data.visualDirection.style && <MetaItem label="Style" value={data.visualDirection.style} />}
                {data.visualDirection.timeOfDay && <MetaItem label="Time of Day" value={data.visualDirection.timeOfDay} />}
                {data.lighting && <MetaItem label="Lighting" value={data.lighting} />}
              </div>
            </div>
          )}

          {/* Duration + Aspect */}
          <div className="vsp__section vsp__section--inline">
            {data.estimatedDuration && (
              <span className="vsp__tag">⏱ {data.estimatedDuration}s</span>
            )}
            {data.aspectRatio && (
              <span className="vsp__tag">📐 {data.aspectRatio}</span>
            )}
          </div>

          {/* AI Video Generators */}
          {data.generators && data.generators.length > 0 && (
            <div className="vsp__section">
              <h4 className="vsp__section-title">🎬 AI Video Generators</h4>
              <div className="vsp__generators">
                {data.generators.map((gen) => (
                  <div className="vsp__generator" key={gen.id}>
                    <div className="vsp__generator-header">
                      <strong className="vsp__generator-name">{gen.name}</strong>
                      <span className="vsp__generator-category">{gen.category}</span>
                    </div>
                    {gen.generationModes && (
                      <div className="vsp__generator-modes">
                        {gen.generationModes.map(m => (
                          <span className="vsp__generator-mode" key={m}>{m}</span>
                        ))}
                      </div>
                    )}
                    {gen.reason && (
                      <p className="vsp__generator-reason">{gen.reason}</p>
                    )}
                    <div className="vsp__generator-meta">
                      {gen.license && <span className="vsp__generator-license">📄 {gen.license}</span>}
                      {gen.difficulty && <span className="vsp__generator-difficulty">⚙ {gen.difficulty}</span>}
                    </div>
                    {gen.licenseRestrictions && (
                      <p className="vsp__generator-warning">⚠ {gen.licenseRestrictions}</p>
                    )}
                    {gen.officialUrl && (
                      <a
                        className="vsp__generator-link"
                        href={gen.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit Project →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search References */}
          {data.searchQueries && (
            <div className="vsp__section">
              <h4 className="vsp__section-title">🔍 Search References</h4>
              <div className="vsp__search-groups">
                <SearchGroup
                  icon="📌"
                  label="Pinterest"
                  queries={data.searchQueries.pinterest}
                  urlBuilder={SEARCH_URL_BUILDERS.pinterest}
                  tip="Use Pinterest visual search/Lens on a reference image to find similar compositions."
                />
                <SearchGroup
                  icon="🖼"
                  label="Google Images"
                  queries={data.searchQueries.googleImages}
                  urlBuilder={SEARCH_URL_BUILDERS.googleImages}
                />
                <SearchGroup
                  icon="🎬"
                  label="Google Video"
                  queries={data.searchQueries.googleVideo}
                  urlBuilder={SEARCH_URL_BUILDERS.googleVideo}
                />
                <SearchGroup
                  icon="▶"
                  label="YouTube"
                  queries={data.searchQueries.youtube}
                  urlBuilder={SEARCH_URL_BUILDERS.youtube}
                />
                <SearchGroupStock
                  queries={data.searchQueries.stockFootage}
                />
              </div>
            </div>
          )}

          {/* Regenerate Button */}
          <div className="vsp__section vsp__section--actions">
            <button className="vsp__regenerate-btn" onClick={() => onRegenerate(scene.sceneId)}>
              🔄 Regenerate Visual Direction
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Metadata item */
function MetaItem({ label, value }) {
  return (
    <div className="vsp__meta-item">
      <span className="vsp__meta-label">{label}</span>
      <span className="vsp__meta-value">{value}</span>
    </div>
  );
}

/** Search query group with clickable links */
function SearchGroup({ icon, label, queries, urlBuilder, tip }) {
  if (!queries || queries.length === 0) return null;

  return (
    <div className="vsp__search-group">
      <div className="vsp__search-group-header">
        <span>{icon} {label}</span>
      </div>
      {queries.map((query, idx) => (
        <div className="vsp__search-item" key={idx}>
          <span className="vsp__search-query">{query}</span>
          <a
            className="vsp__search-link"
            href={urlBuilder(query)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Search →
          </a>
        </div>
      ))}
      {tip && <p className="vsp__search-tip">💡 {tip}</p>}
    </div>
  );
}

/** Stock footage group — no auto-generated URLs, just copyable queries */
function SearchGroupStock({ queries }) {
  if (!queries || queries.length === 0) return null;
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleCopy = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="vsp__search-group">
      <div className="vsp__search-group-header">
        <span>🎞 Stock Footage</span>
      </div>
      {queries.map((query, idx) => (
        <div className="vsp__search-item" key={idx}>
          <span className="vsp__search-query">{query}</span>
          <button
            className="vsp__search-copy"
            onClick={() => handleCopy(query, idx)}
          >
            {copiedIdx === idx ? '✓' : '📋'}
          </button>
        </div>
      ))}
      <p className="vsp__search-tip">
        ⚠ Search on your preferred stock platform. Verify license before use.
      </p>
    </div>
  );
}
