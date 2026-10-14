import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, Check, FilmStrip, Pause, Play, Sparkle } from '@phosphor-icons/react';
import StudioSample from '../studio/StudioSample';
import './studio-motion-preview.css';

const motionQuery = '(prefers-reduced-motion: reduce)';
const subscribeToMotion = callback => {
  const preference = window.matchMedia(motionQuery);
  preference.addEventListener('change', callback);
  return () => preference.removeEventListener('change', callback);
};
const getReducedMotion = () => window.matchMedia(motionQuery).matches;

export default function StudioMotionPreview({ onOpen }) {
  const previewRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, getReducedMotion, () => true);
  const animationEnabled = !reducedMotion && 'IntersectionObserver' in window;
  const playing = !paused && inView && pageVisible && animationEnabled;

  useEffect(() => {
    const preview = previewRef.current;
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 })
      : null;
    observer?.observe(preview);

    const onVisibilityChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={previewRef}
      id="product-preview"
      className={`creator-hero__preview studio-motion ${animationEnabled ? 'is-animated' : 'is-still'}`}
      style={{ '--preview-play-state': playing ? 'running' : 'paused' }}
      role="group"
      aria-label="Example workflow: an idea becomes a script, scene directions, and a video prompt"
    >
      <div className="studio-motion__flow" aria-hidden="true">
        <span className="studio-motion__step studio-motion__step--idea"><b>01</b> Idea</span>
        <ArrowRight />
        <span className="studio-motion__step studio-motion__step--script"><b>02</b> Script</span>
        <ArrowRight />
        <span className="studio-motion__step studio-motion__step--scene"><b>03</b> Scenes</span>
      </div>
      <p className="creator-preview-note">From your first idea<br />to a story worth sharing.</p>

      <StudioSample onOpen={onOpen} />

      <div className="studio-motion__prompt" aria-hidden="true">
        <span className="studio-motion__prompt-icon"><FilmStrip size={18} /></span>
        <div><strong>AI video prompt</strong><p>Golden light. A quiet moment.<br />A slow, cinematic push-in.</p></div>
        <Check size={14} weight="bold" />
      </div>

      <div className="creator-hero__portrait">
        <img src="/images/creator-sunset.png" alt="Illustrative scene: silhouette overlooking a city at golden hour" />
        <div className="studio-motion__viewfinder" aria-hidden="true"><i /><i /><i /><i /></div>
        <span><Play weight="fill" /> Your next story starts here</span>
      </div>

      <div className="studio-motion__transport">
        <div className="studio-motion__status">
          <span className="studio-motion__status-dot" aria-hidden="true" />
          <div className="studio-motion__captions" aria-hidden="true">
            <span className="studio-motion__caption--idea">Every story starts with an idea.</span>
            <span className="studio-motion__caption--script">Finding the words that connect.</span>
            <span className="studio-motion__caption--scene">Bringing each scene into focus.</span>
            <span className="studio-motion__caption--ready">Your story, ready to shape.</span>
          </div>
          <small>Illustrative workflow</small>
        </div>
        <button
          className="studio-motion__toggle"
          type="button"
          aria-label={!animationEnabled ? 'Static preview: animation is disabled' : paused ? 'Play preview animation' : 'Pause preview animation'}
          aria-pressed={paused || !animationEnabled}
          disabled={!animationEnabled}
          onClick={() => setPaused(value => !value)}
        >
          {!animationEnabled ? <Sparkle /> : paused ? <Play weight="fill" /> : <Pause weight="fill" />}
        </button>
        <div className="studio-motion__timeline" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
