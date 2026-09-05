import { IconSparkles, IconScissors, IconLayers, IconGlobe, IconCalendar, IconTarget } from './Icons';
import { ScrollReveal, ScrollRevealText } from '../ui/ScrollReveal';

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
  return (
    <section className="ln-section" id="features">
      <div className="ln-section__container">
        <ScrollReveal className="ln-section__header" distance={34} amount={0.35}>
          <span className="ln-section__badge">Features</span>
          <ScrollRevealText as="h2" className="ln-section__title" delay={0.06} amount={0.45}>
            Everything you need to create Islamic content
          </ScrollRevealText>
          <p className="ln-section__subtitle">Powerful tools designed specifically for Muslim creators and educators.</p>
        </ScrollReveal>

        <div className="ln-features-grid">
          {features.map((feature, i) => (
            <ScrollReveal
              as="article"
              className="ln-feature-card"
              delay={0.08 + i * 0.06}
              amount={0.2}
              distance={26}
              key={i}
            >
              <div className="ln-feature-card__icon">
                <feature.icon size={22} />
              </div>
              <h3 className="ln-feature-card__title">{feature.title}</h3>
              <p className="ln-feature-card__text">{feature.description}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
