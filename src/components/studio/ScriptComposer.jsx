import { Lightbulb, Sparkle, SlidersHorizontal } from '@phosphor-icons/react';
import { CATEGORIES, VIDEO_FORMATS, TONES, LANGUAGES, LLM_MODELS } from '../../constants';

const TOPIC_EXAMPLES = [
  ['Small habits for a more meaningful morning', 'Inspirational · 60s'],
  ['The quiet power of Istighfar', 'Quran & Tafsir · 60s'],
  ['What patience teaches us about hope', 'Educational · 60s'],
  ['Gratitude in the everyday moments', 'Gentle reminder · 60s'],
];

export default function ScriptComposer({ topic, setTopic, extra, setExtra, videoFormat, setVideoFormat, category, setCategory, tone, setTone, language, setLanguage, selectedModel, setSelectedModel, customTone, setCustomTone, isPremium, children }) {
  const select = (label, value, onChange, options) => <label className="studio-field"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value} disabled={o.premium&&!isPremium}>{o.label.replace('✦ ','')}{o.premium&&!isPremium?' · Premium':''}</option>)}</select></label>;
  return <section className="studio-composer"><div className="studio-composer__body"><div className="studio-composer__inputs"><div className="studio-composer__grid"><label className="studio-field studio-topic"><span>What is your video about?</span><textarea value={topic} onChange={e=>setTopic(e.target.value)} maxLength={1000} placeholder="e.g. Small habits that bring more peace into your day..."/><small>{topic.length}/1000</small></label><div className="studio-setting-grid">{select('Platform',videoFormat,setVideoFormat,VIDEO_FORMATS)}{select('Tone',tone,setTone,TONES)}{select('Content category',category,setCategory,CATEGORIES)}{select('Language',language,setLanguage,LANGUAGES)}</div></div><details className="studio-advanced"><summary><SlidersHorizontal size={16}/> More options <span>Model & additional context</span></summary><div>{select('AI model',selectedModel,setSelectedModel,LLM_MODELS)}<label className="studio-field"><span>Additional context <small>(optional)</small></span><textarea value={extra} onChange={e=>setExtra(e.target.value)} placeholder="Audience, references, or specific points to include"/></label>{tone==='custom'&&isPremium&&<label className="studio-field"><span>Custom tone</span><input value={customTone} onChange={e=>setCustomTone(e.target.value)} maxLength={200} placeholder="Warm, thoughtful, and conversational"/></label>}</div></details>{children}</div><aside className="studio-examples"><h3><Lightbulb size={17}/> Try these ideas</h3>{TOPIC_EXAMPLES.map(([text,meta])=><button key={text} onClick={()=>setTopic(text)}><Sparkle weight="fill" size={17}/><span>{text}<small>{meta}</small></span></button>)}</aside></div></section>;
}
