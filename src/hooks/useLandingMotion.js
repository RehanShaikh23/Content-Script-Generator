import { useEffect, useRef } from 'react';

/** Progressive enhancement: content stays visible if motion or observers are unavailable. */
export default function useLandingMotion() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 761px)');
    const header = root.querySelector('.creator-header');
    const progress = root.querySelector('.creator-scroll-progress');
    const hero = root.querySelector('.creator-hero');
    const preview = root.querySelector('.creator-hero__preview');
    const banner = root.querySelector('.creator-banner');
    const sceneStack = root.querySelector('.creator-scene-stack');
    const elements = new Set();
    let observer;
    let frame = 0;

    const register = (element, index = 0) => {
      element.classList.add('creator-reveal');
      element.style.setProperty('--reveal-delay', `${Math.min(index * 65, 260)}ms`);
      elements.add(element);
    };

    root.querySelectorAll('.creator-section__heading, .creator-banner > div, .creator-hero__preview')
      .forEach(element => register(element));
    root.querySelectorAll('.creator-hero__copy, .creator-feature-grid, .creator-steps, .creator-idea-rail, .creator-pricing, .creator-final')
      .forEach(group => Array.from(group.children).forEach(register));
    root.querySelectorAll('.creator-faq details').forEach(register);

    const reveal = element => {
      element.classList.add('is-revealed');
      observer?.unobserve(element);
    };

    const updateScroll = () => {
      frame = 0;
      const top = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      header?.classList.toggle('is-scrolled', top > 16);
      progress?.style.setProperty('transform', `scaleX(${Math.min(1, Math.max(0, top / maxScroll))})`);

      // Modest, bounded depth on larger screens. Never animate the text or hijack scrolling.
      if (!reducedMotion.matches && desktop.matches) {
        const heroRect = hero.getBoundingClientRect();
        const bannerRect = banner.getBoundingClientRect();
        if (heroRect.bottom > 0 && heroRect.top < window.innerHeight) {
          preview.style.setProperty('--hero-depth', `${Math.min(32, Math.max(0, -heroRect.top * 0.065))}px`);
        }
        if (bannerRect.bottom > 0 && bannerRect.top < window.innerHeight) {
          const position = (window.innerHeight - bannerRect.top) / (window.innerHeight + bannerRect.height);
          sceneStack.style.setProperty('--scene-depth', `${(0.5 - position) * 44}px`);
        }
      } else {
        preview.style.removeProperty('--hero-depth');
        sceneStack.style.removeProperty('--scene-depth');
      }
    };

    const scheduleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScroll);
    };

    const configureMotion = () => {
      observer?.disconnect();
      root.classList.remove('has-motion');
      if (!reducedMotion.matches && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) reveal(entry.target);
          });
        }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });

        elements.forEach(element => {
          if (!element.classList.contains('is-revealed')) observer.observe(element);
        });
        root.classList.add('has-motion');
      }
      scheduleScroll();
    };

    // Keyboard users must never land on an invisible control during a delayed reveal.
    const handleFocus = event => {
      let element = event.target.closest('.creator-reveal');
      while (element && root.contains(element)) {
        element.style.setProperty('--reveal-delay', '0ms');
        reveal(element);
        element = element.parentElement?.closest('.creator-reveal');
      }
    };

    configureMotion();
    const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(scheduleScroll) : null;
    resizeObserver?.observe(root);
    root.addEventListener('focusin', handleFocus);
    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', scheduleScroll);
    reducedMotion.addEventListener('change', configureMotion);
    desktop.addEventListener('change', scheduleScroll);

    return () => {
      observer?.disconnect();
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(frame);
      root.removeEventListener('focusin', handleFocus);
      window.removeEventListener('scroll', scheduleScroll);
      window.removeEventListener('resize', scheduleScroll);
      reducedMotion.removeEventListener('change', configureMotion);
      desktop.removeEventListener('change', scheduleScroll);
      root.classList.remove('has-motion');
      elements.forEach(element => {
        element.classList.remove('creator-reveal', 'is-revealed');
        element.style.removeProperty('--reveal-delay');
      });
      preview.style.removeProperty('--hero-depth');
      sceneStack.style.removeProperty('--scene-depth');
    };
  }, []);

  return rootRef;
}
