import { ArrowRight, Check, Copy, DownloadSimple, FilmStrip, House, MagicWand, Play, Sparkle, YoutubeLogo } from '@phosphor-icons/react';
import Brand from './Brand';

const SAMPLE_LINES = [
  ['0:00 – 0:03', 'HOOK', 'What if one small habit could bring more peace into your everyday life?'],
  ['0:03 – 0:12', 'SCENE 1', 'Begin your morning with gratitude. Pause, take a breath, and say Alhamdulillah.'],
  ['0:12 – 0:24', 'SCENE 2', 'Before you reach for your phone, make a little space for remembrance.'],
];

export function SampleScript({ compact = false, onTry }) {
  return <div className={`sample-script ${compact ? 'sample-script--compact' : ''}`}>
    <div className="sample-script__heading"><YoutubeLogo size={27} weight="fill" /><div><strong>Small Habits, A More Meaningful Morning</strong><p>YouTube Shorts · 60 seconds · Inspirational</p></div></div>
    <div className="sample-script__grid"><div>{SAMPLE_LINES.map(([time, label, text]) => <div className="sample-script__line" key={label}><time>{time}</time><span className={label === 'HOOK' ? 'sample-tag sample-tag--green' : 'sample-tag'}>{label}</span><p>{text}</p></div>)}</div>
      <div className="sample-script__visual"><img src="/images/creator-sunset.png" alt="Creator looking out over a city at sunset" /><span className="sample-script__caption">Illustrative scene</span>{onTry && <button className="studio-btn studio-btn--soft" onClick={onTry}>Try this topic <ArrowRight size={15} /></button>}</div>
    </div>
  </div>;
}

export default function StudioSample({ onOpen }) {
  return <div className="studio-mock" aria-label="Example of the script workspace">
    <aside className="studio-mock__sidebar"><Brand compact /><div><span><House /> Dashboard</span><span className="is-active"><MagicWand /> Create Script</span><span><FilmStrip /> Visual Scenes</span><span><Copy /> Saved Scripts</span></div><div className="studio-mock__upgrade"><Sparkle /> Make more, with Premium<span>More possibilities. One workspace.</span></div></aside>
    <div className="studio-mock__main"><header><h3>Create Your Script</h3><p>Turn your ideas into meaningful content with AI</p></header><div className="studio-tabs"><span className="is-active">Script</span><span>Visual Scenes</span><span>AI Video Prompts</span></div>
      <div className="studio-mock__form"><div><b>What is your video about?</b><div className="studio-mock__textarea">Small habits for a more meaningful morning...</div></div><div className="studio-mock__settings"><label>Platform<span><YoutubeLogo weight="fill" /> YouTube Shorts</span></label><label>Tone<span>Inspirational</span></label><label>Video Length<span>60 seconds</span></label><label>Language<span>English</span></label></div></div>
      <button className="studio-btn studio-btn--dark" onClick={onOpen}>Generate Script <Sparkle weight="fill" /></button>
      <h4>Generated Script <span>Example preview</span></h4><SampleScript compact />
      <div className="studio-mock__actions"><span><Check /> Ready to refine</span><span><Copy /> Copy</span><span><DownloadSimple /> Export</span></div>
    </div>
  </div>;
}
