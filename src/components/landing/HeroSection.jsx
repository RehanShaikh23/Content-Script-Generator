import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconBookOpen, IconCpu, IconLanguages, IconUsers } from './Icons';
import RotatingText from '../RotatingText/RotatingText';
import ScrollScaleReveal from '../ui/ScrollScaleReveal';

const previewIdeas = [
  {
    id: 'istighfar',
    label: 'Daily reminder',
    title: 'The quiet power of Istighfar',
    meta: 'YouTube Short · 48 sec · Educational',
    opening: 'What if one simple habit could bring calm to your heart, widen your provision, and turn regret into hope?',
    source: 'Inspired by Surah Nuh, 71:10–12',
  },
  {
    id: 'musa',
    label: 'Prophet stories',
    title: 'When Musa chose courage',
    meta: 'Instagram Reel · 60 sec · Storytelling',
    opening: 'The sea was ahead. An army was behind. Yet Musa answered fear with certainty: My Lord is with me; He will guide me.',
    source: 'Inspired by Surah Ash-Shu\'ara, 26:61–62',
  },
  {
    id: 'fajr',
    label: 'Creator series',
    title: 'Build your life around Fajr',
    meta: 'TikTok · 35 sec · Motivational',
    opening: 'Before the world asks anything from you, Fajr gives you a moment to remember who you are and Who you belong to.',
    source: 'Creator format · Episode 01',
  },
];

export default function HeroSection() {
  const [activeIdea, setActiveIdea] = useState(previewIdeas[0]);

  return (
    <section className="ln-hero" id="hero">
      <div className="ln-hero__content">
        {/* Badge */}
        <div className="ln-hero__badge">
          <span className="ln-hero__badge-dot" />
          Editorial AI for Muslim creators
        </div>

        {/* Headline */}
        <h1 className="ln-hero__title" id="hero-title">
          <span className="ln-hero__lead">Ideas worth sharing.</span><br />
          <RotatingText
            texts={['Scripts with soul.', 'Stories with purpose.', 'Content with clarity.', 'Da\'wah that connects.']}
            mainClassName="ln-hero__rotating"
            staggerFrom="last"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-120%" }}
            staggerDuration={0.018}
            splitLevelClassName="overflow-hidden"
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            rotationInterval={3600}
          />
        </h1>

        {/* Subheading */}
        <p className="ln-hero__subtitle">
          Turn a thought into a structured, source-aware script for YouTube, Reels, and TikTok without losing your voice.
        </p>

        {/* CTA */}
        <div className="ln-hero__cta">
          <Link to="/signup" className="ln-hero__btn ln-hero__btn--primary" id="hero-cta-start">
            Create your first script
            <IconArrowRight size={18} />
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="ln-hero__trust">
          <div className="ln-hero__trust-item">
            <span className="ln-hero__trust-icon"><IconBookOpen size={16} /></span>
            Quran Based
          </div>
          <div className="ln-hero__trust-item">
            <span className="ln-hero__trust-icon"><IconCpu size={16} /></span>
            AI Powered
          </div>
          <div className="ln-hero__trust-item">
            <span className="ln-hero__trust-icon"><IconLanguages size={16} /></span>
            Multi Language
          </div>
          <div className="ln-hero__trust-item">
            <span className="ln-hero__trust-icon"><IconUsers size={16} /></span>
            Creator Focused
          </div>
        </div>
      </div>

      <ScrollScaleReveal className="ln-hero__preview-stage" startScale={0.45}>
        <div className="ln-hero__preview" aria-label="Interactive script studio preview">
          <div className="ln-preview__rail">
            <div className="ln-preview__rail-header">
              <span>Studio / Drafts</span>
              <span>03</span>
            </div>
            <div className="ln-preview__ideas">
              {previewIdeas.map((idea, index) => (
                <button
                  type="button"
                  key={idea.id}
                  className={`ln-preview__idea ${activeIdea.id === idea.id ? 'ln-preview__idea--active' : ''}`}
                  onClick={() => setActiveIdea(idea)}
                  aria-pressed={activeIdea.id === idea.id}
                >
                  <span>0{index + 1}</span>
                  {idea.label}
                </button>
              ))}
            </div>
            <p className="ln-preview__rail-note">Select a direction to preview the script opening.</p>
          </div>

          <div className="ln-preview__editor">
            <div className="ln-preview__toolbar">
              <span>Draft preview</span>
              <span className="ln-preview__status">Ready to refine</span>
            </div>
            <div className="ln-preview__content" key={activeIdea.id}>
              <p className="ln-preview__eyebrow">{activeIdea.meta}</p>
              <h2>{activeIdea.title}</h2>
              <p className="ln-preview__opening">{activeIdea.opening}</p>
              <p className="ln-preview__source">{activeIdea.source}</p>
            </div>
            <div className="ln-preview__footer">
              <span>Authenticity check included</span>
              <Link to="/signup">Open in studio <IconArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </ScrollScaleReveal>
    </section>
  );
}
