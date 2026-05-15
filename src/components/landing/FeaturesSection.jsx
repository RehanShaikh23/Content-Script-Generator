import { useScrollReveal } from '../../hooks/useScrollReveal';
import { IconSparkles, IconScissors, IconLayers, IconGlobe, IconCalendar, IconTarget } from './Icons';

const features = [
  {
    icon: IconSparkles,
    title: 'AI-Powered Scripts',
    description: 'Generate complete Islamic video scripts in seconds with AI trained on authentic sources.',
  },
  {
    icon: IconScissors,
    title: 'YouTube Shorts & Reels',
    description: 'Optimized short-form scripts for YouTube Shorts, Instagram Reels, and TikTok.',
  },
  {
    icon: IconLayers,
    title: '8 Content Categories',
    description: 'Quran, Hadith, Prophets\' Stories, Islamic History, Fiqh, Duas, Akhirah, and more.',
  },
  {
    icon: IconGlobe,
    title: '9 Languages',
    description: 'Create content in English, Arabic, Urdu, Hindi, Bangla, Turkish, Malay, French, and Spanish.',
  },
  {
    icon: IconCalendar,
    title: 'Content Calendar',
    description: 'Plan 7–30 days of structured Islamic content with our AI-powered planner.',
  },
  {
    icon: IconTarget,
    title: 'Creator Tips',
    description: 'Get upload strategies from Muslim Empire, a 300K+ subscriber Islamic channel.',
  },
];

export default function FeaturesSection() {
  const ref = useScrollReveal();

  return (
    <section className="ln-section" id="features" ref={ref}>
      <div className="ln-section__container ln-scroll-reveal">
        <div className="ln-section__header">
          <span className="ln-section__badge">Features</span>
          <h2 className="ln-section__title">Everything you need to create Islamic content</h2>
          <p className="ln-section__subtitle">Powerful tools designed specifically for Muslim creators and educators.</p>
        </div>

        <div className="ln-features-grid">
          {features.map((feature, i) => (
            <article className="ln-feature-card" key={i}>
              <div className="ln-feature-card__icon">
                <feature.icon size={22} />
              </div>
              <h3 className="ln-feature-card__title">{feature.title}</h3>
              <p className="ln-feature-card__text">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
