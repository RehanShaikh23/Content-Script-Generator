import { motion, useReducedMotion } from 'motion/react';

const motionTags = {
  article: motion.article,
  div: motion.div,
  h2: motion.h2,
  p: motion.p,
};

const revealEase = [0.16, 1, 0.3, 1];

export function ScrollReveal({
  as = 'div',
  children,
  className = '',
  delay = 0,
  distance = 30,
  amount = 0.25,
}) {
  const shouldReduceMotion = useReducedMotion();
  const MotionTag = motionTags[as] ?? motion.div;

  return (
    <MotionTag
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: distance, filter: 'blur(8px)' }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.85, delay, ease: revealEase }}
    >
      {children}
    </MotionTag>
  );
}

export function ScrollRevealText({
  as = 'p',
  children,
  className = '',
  delay = 0,
  amount = 0.55,
}) {
  const shouldReduceMotion = useReducedMotion();
  const MotionTag = motionTags[as] ?? motion.p;
  const text = String(children).trim();
  const words = text.split(/\s+/);

  if (shouldReduceMotion) {
    return <MotionTag className={className}>{text}</MotionTag>;
  }

  return (
    <MotionTag
      className={`scroll-reveal-text ${className}`.trim()}
      aria-label={text}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: 0.035,
          },
        },
      }}
    >
      {words.map((word, index) => (
        <span className="scroll-reveal-text__mask" aria-hidden="true" key={`${word}-${index}`}>
          <motion.span
            className="scroll-reveal-text__word"
            variants={{
              hidden: { opacity: 0, y: '0.8em', filter: 'blur(7px)' },
              visible: {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                transition: { duration: 0.72, ease: revealEase },
              },
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}
