import { createElement, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, CaretDown, FilmStrip, FileText, Play, MagnifyingGlass, Sparkle, Clock, ChartLineUp, Images, Users, List, X, YoutubeLogo, Copy, Globe, BookOpen } from '@phosphor-icons/react';
import Brand from '../studio/Brand';
import StudioSample from '../studio/StudioSample';
import AuthCard from './AuthCard';

const FEATURES = [
  [FileText, 'AI Script Generation', 'Shape your ideas into compelling scripts with strong hooks and a clear story.'],
  [Images, 'Visual Scene Planning', 'Get detailed visual direction for every scene in your script.'],
  [Play, 'AI Video Prompts', 'Create ready-to-use prompts for your favorite AI video tools.'],
  [MagnifyingGlass, 'Clip Search Suggestions', 'Find relevant clips on YouTube, Pexels, Pinterest, and more.'],
];
const IDEAS = [
  ['Small Habits, A More Meaningful Morning', 'morning-routine.png', 'Daily reminders'],
  ['Finding Peace in a Busy World', 'creator-sunset.png', 'Faith & reflection'],
  ['The Quiet Power of Gratitude', 'morning-routine.png', 'Quran & Tafsir'],
  ['A Little Patience Goes a Long Way', 'creator-sunset.png', 'Hadith & Sunnah'],
  ['Make Time for What Matters', 'morning-routine.png', 'Duas & Dhikr'],
];
const FAQS = [
  ['What can I create?', 'Create scripts for Islamic YouTube videos, Shorts, and Reels, then turn each scene into visual directions and AI video prompts. Always review generated references before publishing.'],
  ['Can I try it for free?', 'Yes. Create an account to try the app with your available free credits. You can choose a paid plan when you need more.'],
  ['Does this generate finished videos?', 'No. The app creates scripts, scene directions, video prompts, and clip-search links. Use these in your preferred video editor or generation tool.'],
  ['Which languages are supported?', 'English is included. Premium adds Arabic, Urdu, Hindi, Bangla, Turkish, Malay, French, and Spanish.'],
];

export default function LandingExperience({ onSubmit, error, isLoading }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rail = useRef(null);
  const dialog = useRef(null);
  const loginTrigger = useRef(null);
  const closeLogin = () => { setLoginOpen(false); loginTrigger.current?.focus(); };
  useEffect(() => {
    if (loginOpen) { dialog.current?.showModal(); dialog.current?.querySelector('input')?.focus(); }
    else dialog.current?.close();
  }, [loginOpen]);
  const jump = id => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  return <div className="creator-landing">
    <nav className="creator-nav"><Brand /><div className={`creator-nav__links ${menuOpen ? 'is-open' : ''}`}><button onClick={() => jump('features')}>Features</button><button onClick={() => jump('pricing')}>Pricing</button><button onClick={() => jump('how-it-works')}>How it works</button><button onClick={() => jump('faq')}>FAQ</button></div><div className="creator-nav__actions"><button ref={loginTrigger} className="studio-btn studio-btn--outline" onClick={() => setLoginOpen(true)}>Log in</button><Link className="studio-btn studio-btn--dark" to="/signup">Get Started Free</Link><button className="creator-menu" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <List />}</button></div></nav>
    <main>
      <section className="creator-hero">
        <div className="creator-hero__copy"><span className="creator-eyebrow"><Sparkle weight="fill" /> Turn meaningful ideas into videos</span><h1>Create<br />Content That<br />Connects.<br /><span>Faster with AI.</span></h1><p>Generate compelling Islamic scripts, visual scenes, and AI video prompts — all in one place.</p><ul>{['Hooks that spark curiosity', 'Scene-by-scene visual guidance', 'AI video prompts + clip suggestions', 'Built for YouTube, TikTok & Instagram'].map(text => <li key={text}><Check weight="bold" />{text}</li>)}</ul><div className="creator-hero__buttons"><Link to="/signup" className="studio-btn studio-btn--lime">Get Started Free <ArrowRight /></Link><button className="studio-btn studio-btn--outline" onClick={() => jump('product-preview')}><Play /> Explore the studio</button></div><small>No credit card required</small><div className="creator-facts"><div><strong>8</strong><span>Islamic content<br />categories</span></div><div><strong>9</strong><span>Languages for<br />your audience</span></div><div><strong>All in one</strong><span>Script, scenes<br />& video prompts</span></div></div></div>
        <div className="creator-hero__preview" id="product-preview"><p className="creator-preview-note">From your first idea<br />to a story worth sharing.</p><StudioSample onOpen={() => setLoginOpen(true)} /><div className="creator-hero__portrait"><img src="/images/creator-sunset.png" alt="Silhouette overlooking a city at golden hour" /><span><Play weight="fill" /> Your next story starts here</span></div></div>
      </section>
      <section className="creator-section creator-section--white" id="features"><div className="creator-section__heading"><h2>Everything you need to bring an idea to life</h2><p>From script to visuals to video prompts — all powered by AI.</p></div><div className="creator-feature-grid">{FEATURES.map(([Icon, title, copy]) => <article key={title}><span className="creator-icon">{createElement(Icon, { size: 24 })}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
        <div className="creator-section__heading creator-how-heading" id="how-it-works"><h2>How it works</h2><p>Create meaningful content in 3 simple steps.</p></div><div className="creator-steps">{[['Enter your topic','Tell us what you want to share with the world.'],['Generate with AI','Get your script, visual scenes, and video prompts.'],['Create your video','Use the prompts and clip suggestions in your video tools.']].map(([title,copy],i) => <article key={title}><span>{i+1}</span><div><h3>{title}</h3><p>{copy}</p></div>{i<2 && <ArrowRight className="creator-step-arrow" />}</article>)}</div>
      </section>
      <section className="creator-banner"><div><span className="creator-eyebrow"><span>NEW</span> Visual Scenes & AI Prompts</span><h2>Turn your script<br />into <em>stunning visuals.</em></h2><p>Get detailed visual directions, camera angles, AI video prompts, and clip suggestions for every scene.</p><Link className="studio-btn studio-btn--lime" to="/signup">See it in action <ArrowRight /></Link></div><div className="creator-scene-stack"><div className="creator-scene-photo"><span>Scene 2 · Morning reflection</span><img src="/images/morning-routine.png" alt="Warm sunlight falling into a peaceful bedroom" /></div><div className="creator-prompt-card"><h3><FilmStrip /> AI Video Prompt</h3><p>A cinematic morning scene, warm sunlight streaming through a window, a quiet moment of reflection. Natural light, warm tones, documentary realism.</p><span><Copy /> Ready for your video tool</span><hr /><b>Find similar clips</b><div><YoutubeLogo /> YouTube <MagnifyingGlass /> Pexels</div></div></div></section>
      <section className="creator-section creator-shorts"><div className="creator-section__heading creator-section__heading--row"><div><h2>Big ideas. Short stories.</h2><p>A little inspiration for your next Islamic video.</p></div><div className="creator-rail-controls"><button aria-label="Previous ideas" onClick={() => rail.current.scrollBy({ left: -300, behavior:'smooth' })}><ArrowLeft /></button><button aria-label="Next ideas" onClick={() => rail.current.scrollBy({ left: 300, behavior:'smooth' })}><ArrowRight /></button></div></div><div className="creator-idea-rail" ref={rail}>{IDEAS.map(([title,image,category],i) => <Link to="/signup" className="creator-idea" key={title}><div><img src={`/images/${image}`} alt={i % 2 ? 'Sunset over the city' : 'A peaceful morning'} loading="lazy" /><span><Play weight="fill" /></span><small>STORY IDEA {String(i+1).padStart(2,'0')}</small></div><h3>{title}</h3><p><YoutubeLogo weight="fill" /> {category}</p></Link>)}</div></section>
      <section className="creator-section creator-benefits"><div className="creator-section__heading"><h2>Less busywork. More meaningful stories.</h2><p>Make more space for the creative part.</p></div><div className="creator-feature-grid">{[[Clock,'Save time','Start with a complete draft instead of a blank page.'],[ChartLineUp,'Stronger stories','Build a clear hook, thoughtful narrative, and closing.'],[Images,'Better visuals','Plan each scene with useful visual directions.'],[Users,'Reach your audience','Adapt your message to the platform and language.']].map(([Icon,title,copy])=><article key={title}><span className="creator-icon">{createElement(Icon, { size: 23 })}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
      <section className="creator-section" id="pricing"><div className="creator-section__heading"><h2>Simple, transparent pricing</h2><p>Choose the plan that fits your creative journey.</p></div><div className="creator-pricing">{[{title:'Free',price:'0',desc:'A little room to explore.',features:['Starter generation credits','Standard AI models','Script & visual workflow'],cta:'Get Started Free'},{title:'Standard',price:'399',desc:'For a consistent creative practice.',features:['50 scripts per month','Shorts & Reels formats','5 tone presets','30-day script history'],cta:'Choose Standard'},{title:'Premium',price:'1,199',desc:'For creators ready to do more.',features:['Unlimited script generation','Advanced OpenRouter models','All formats & custom tones','9 languages','PDF & DOCX export'],cta:'Choose Premium',popular:true}].map(plan=><article className={plan.popular?'is-popular':''} key={plan.title}>{plan.popular&&<span className="creator-popular">Most flexible</span>}<h3>{plan.title}</h3><p>{plan.desc}</p><div className="creator-price">₹{plan.price}<span>{plan.price==='0'?' / to start':' / month'}</span></div><ul>{plan.features.map(f=><li key={f}><Check />{f}</li>)}</ul><Link to="/signup" className={`studio-btn ${plan.popular?'studio-btn--lime':'studio-btn--outline'}`}>{plan.cta}<ArrowRight /></Link></article>)}</div></section>
      <section className="creator-section creator-faq" id="faq"><div className="creator-section__heading"><h2>A few things you might be wondering</h2></div>{FAQS.map(([q,a])=><details key={q}><summary>{q}<CaretDown /></summary><p>{a}</p></details>)}</section>
      <section className="creator-final"><span className="creator-eyebrow">Ready to create something meaningful?</span><h2>Turn your ideas into stories worth sharing.</h2><p>Your next video starts with a single thought.</p><Link className="studio-btn studio-btn--lime" to="/signup">Get Started Free <ArrowRight /></Link><small>No credit card required</small></section>
    </main><footer className="creator-footer"><Brand /><p>© {new Date().getFullYear()} Muslim Empire</p><a href="https://youtube.com/channel/UCZPwhRuiM4_6xDEan3KzRFw" target="_blank" rel="noreferrer">Visit our YouTube <ArrowRight /></a></footer>
    <dialog ref={dialog} className="creator-auth-dialog" aria-label="Sign in" onCancel={closeLogin} onClick={e => { if(e.target===dialog.current) closeLogin(); }}><button className="creator-dialog-close" aria-label="Close sign in" onClick={closeLogin}><X size={22}/></button><AuthCard mode="login" onSubmit={onSubmit} error={error} isLoading={isLoading}/></dialog>
  </div>;
}
