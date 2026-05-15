import { useState } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { IconChevronDown } from './Icons';

const faqs = [
  {
    q: 'What is the Islamic Script Generator?',
    a: 'An AI-powered tool that creates ready-to-use video scripts for Islamic content — YouTube Shorts, Reels, TikTok, and long-form videos covering Quran, Hadith, Prophet stories, Islamic history, and more.',
  },
  {
    q: 'Is it free to use?',
    a: 'Yes! We offer a free plan with limited credits so you can try it immediately. Premium plans starting at $5/month offer unlimited scripts, multi-language support, PDF/DOCX export, and exclusive Creator Tips.',
  },
  {
    q: 'What types of Islamic content can I generate?',
    a: 'Scripts across 8 categories: Quran & Tafsir, Hadith & Sunnah, Prophets\' Stories, Islamic History, Fiqh & Rulings, Duas & Dhikr, Akhirah & Jannah, and Modern Islamic Issues — in multiple tones.',
  },
  {
    q: 'What languages are supported?',
    a: '9 languages: English, Arabic, Urdu, Hindi, Bangla, Turkish, Malay/Indonesian, French, and Spanish. Multi-language support is available on Premium plans.',
  },
  {
    q: 'How does this help grow my Islamic channel?',
    a: 'Our tool generates optimized, engaging scripts designed for Islamic content. Premium users also get Creator Tips from Muslim Empire (300K+ subscribers) covering upload strategies, SEO, and content planning.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const ref = useScrollReveal();

  return (
    <section className="ln-section ln-section--alt" id="faq" ref={ref}>
      <div className="ln-section__container ln-scroll-reveal">
        <div className="ln-section__header">
          <span className="ln-section__badge">FAQ</span>
          <h2 className="ln-section__title">Frequently asked questions</h2>
        </div>

        <div className="ln-faq">
          {faqs.map((item, i) => (
            <div className={`ln-faq__item ${openIndex === i ? 'ln-faq__item--open' : ''}`} key={i}>
              <button
                className="ln-faq__trigger"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
                id={`ln-faq-${i}`}
              >
                <span className="ln-faq__question">{item.q}</span>
                <span className={`ln-faq__chevron ${openIndex === i ? 'ln-faq__chevron--open' : ''}`}>
                  <IconChevronDown size={18} />
                </span>
              </button>
              <div
                className="ln-faq__answer-wrap"
                style={{ maxHeight: openIndex === i ? '300px' : '0' }}
              >
                <div className="ln-faq__answer" role="region" aria-labelledby={`ln-faq-${i}`}>
                  <p>{item.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
