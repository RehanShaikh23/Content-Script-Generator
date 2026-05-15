import { Link } from 'react-router-dom';
import { IconMoon, IconYoutube, IconTwitter, IconInstagram } from './Icons';

export default function LandingFooter() {
  return (
    <footer className="ln-footer" id="landing-footer">
      <div className="ln-footer__inner">
        <div className="ln-footer__grid">
          {/* Brand */}
          <div className="ln-footer__brand">
            <div className="ln-footer__logo">
              <IconMoon size={18} />
              <span>Islamic Script Generator</span>
            </div>
            <p className="ln-footer__desc">
              AI-powered Islamic content creation tool by Muslim Empire. Generate authentic video scripts in seconds.
            </p>
            <div className="ln-footer__social">
              <a href="https://youtube.com/channel/UCZPwhRuiM4_6xDEan3KzRFw" target="_blank" rel="noopener noreferrer" className="ln-footer__social-link" aria-label="YouTube">
                <IconYoutube size={18} />
              </a>
              <a href="#" className="ln-footer__social-link" aria-label="Twitter">
                <IconTwitter size={18} />
              </a>
              <a href="#" className="ln-footer__social-link" aria-label="Instagram">
                <IconInstagram size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="ln-footer__col">
            <h4 className="ln-footer__col-title">Product</h4>
            <Link to="/signup" className="ln-footer__link">Get Started</Link>
            <Link to="/login" className="ln-footer__link">Sign In</Link>
            <button className="ln-footer__link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
            <button className="ln-footer__link" onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}>FAQ</button>
          </div>

          {/* Legal */}
          <div className="ln-footer__col">
            <h4 className="ln-footer__col-title">Legal</h4>
            <span className="ln-footer__link ln-footer__link--static">Privacy Policy</span>
            <span className="ln-footer__link ln-footer__link--static">Terms of Service</span>
          </div>
        </div>

        <div className="ln-footer__bottom">
          <p>&copy; {new Date().getFullYear()} Muslim Empire. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
