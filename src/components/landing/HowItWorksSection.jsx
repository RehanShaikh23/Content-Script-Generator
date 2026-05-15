import { useScrollReveal } from '../../hooks/useScrollReveal';

const steps = [
  {
    number: '1',
    title: 'Choose Your Topic',
    description: 'Enter any Islamic topic and select your format, category, language, and tone.',
  },
  {
    number: '2',
    title: 'AI Generates Your Script',
    description: 'Our AI creates a complete script with Quranic ayat, hadith references, and narrative structure.',
  },
  {
    number: '3',
    title: 'Copy, Export & Publish',
    description: 'Copy to clipboard, export as PDF/DOCX, or plan your month with the Content Calendar.',
  },
];

export default function HowItWorksSection() {
  const ref = useScrollReveal();

  return (
    <section className="ln-section" id="how-it-works" ref={ref}>
      <div className="ln-section__container ln-scroll-reveal">
        <div className="ln-section__header">
          <span className="ln-section__badge">How It Works</span>
          <h2 className="ln-section__title">Three simple steps to your next script</h2>
        </div>

        <div className="ln-steps">
          {steps.map((step, i) => (
            <div className="ln-step" key={i}>
              <div className="ln-step__number">{step.number}</div>
              {i < steps.length - 1 && <div className="ln-step__connector" aria-hidden="true" />}
              <h3 className="ln-step__title">{step.title}</h3>
              <p className="ln-step__text">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
