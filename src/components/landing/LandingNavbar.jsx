import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconMenu, IconX, IconMoon } from './Icons';

export default function LandingNavbar({ activePage = 'login' }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function scrollToSection(id) {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <nav className={`ln-navbar ${scrolled ? 'ln-navbar--scrolled' : ''}`} id="landing-navbar">
        <div className="ln-navbar__inner">
          {/* Logo */}
          <Link to="/login" className="ln-navbar__logo" id="navbar-logo">
            <span className="ln-navbar__logo-icon"><IconMoon size={18} /></span>
            <span className="ln-navbar__logo-text">Islamic Script Generator</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="ln-navbar__links">
            <button className="ln-navbar__link" onClick={() => scrollToSection('features')}>Features</button>
            <button className="ln-navbar__link" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button className="ln-navbar__link" onClick={() => scrollToSection('faq')}>FAQ</button>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="ln-navbar__actions">
            {activePage === 'login' ? (
              <>
                <Link to="/signup" className="ln-navbar__btn ln-navbar__btn--primary" id="navbar-get-started">Get Started</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="ln-navbar__btn ln-navbar__btn--ghost" id="navbar-sign-in">Sign In</Link>
                <Link to="/signup" className="ln-navbar__btn ln-navbar__btn--primary" id="navbar-get-started">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="ln-navbar__hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            id="navbar-hamburger"
          >
            {mobileOpen ? <IconX size={22} /> : <IconMenu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="ln-mobile-menu" id="mobile-menu">
          <div className="ln-mobile-menu__backdrop" onClick={() => setMobileOpen(false)} />
          <div className="ln-mobile-menu__panel">
            <button className="ln-mobile-menu__link" onClick={() => scrollToSection('features')}>Features</button>
            <button className="ln-mobile-menu__link" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button className="ln-mobile-menu__link" onClick={() => scrollToSection('faq')}>FAQ</button>
            <div className="ln-mobile-menu__divider" />
            {activePage === 'login' ? (
              <Link to="/signup" className="ln-mobile-menu__btn" onClick={() => setMobileOpen(false)}>Get Started</Link>
            ) : (
              <>
                <Link to="/login" className="ln-mobile-menu__btn ln-mobile-menu__btn--ghost" onClick={() => setMobileOpen(false)}>Sign In</Link>
                <Link to="/signup" className="ln-mobile-menu__btn" onClick={() => setMobileOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
