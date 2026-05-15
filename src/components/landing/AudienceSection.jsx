import { useScrollReveal } from '../../hooks/useScrollReveal';
import { IconPlay, IconMessageCircle, IconGraduationCap, IconTrendingUp } from './Icons';

const audiences = [
  {
    icon: IconPlay,
    title: 'Islamic YouTubers',
    description: 'Save hours of scriptwriting and grow your Islamic channel with engaging, optimized scripts.',
  },
  {
    icon: IconMessageCircle,
    title: 'Social Media Da\'wah',
    description: 'Create consistent, high-quality Islamic content for Instagram Reels, TikTok, and Facebook.',
  },
  {
    icon: IconGraduationCap,
    title: 'Islamic Educators',
    description: 'Generate educational content about Quran, Hadith, and Islamic topics for your community.',
  },
  {
    icon: IconTrendingUp,
    title: 'Muslim Content Creators',
    description: 'Get professional Islamic scripts that resonate with your audience, whether starting or scaling.',
  },
];

export default function AudienceSection() {
  const ref = useScrollReveal();

  return (
    <section className="ln-section ln-section--alt" id="audience" ref={ref}>
      <div className="ln-section__container ln-scroll-reveal">
        <div className="ln-section__header">
          <span className="ln-section__badge">Who It's For</span>
          <h2 className="ln-section__title">Built for Muslim creators worldwide</h2>
          <p className="ln-section__subtitle">Whether you create shorts, long-form, or educational content — this tool is for you.</p>
        </div>

        <div className="ln-audience-grid">
          {audiences.map((item, i) => (
            <article className="ln-audience-card" key={i}>
              <div className="ln-audience-card__icon">
                <item.icon size={22} />
              </div>
              <div>
                <h3 className="ln-audience-card__title">{item.title}</h3>
                <p className="ln-audience-card__text">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
