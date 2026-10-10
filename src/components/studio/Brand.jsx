import { Link } from 'react-router-dom';
import { Sparkle } from '@phosphor-icons/react';

export default function Brand({ compact = false }) {
  return <Link className={`studio-brand ${compact ? 'studio-brand--compact' : ''}`} to="/login" aria-label="Islamic Script Generator home">
    <span className="studio-brand__mark"><Sparkle weight="fill" size={23} /></span>
    <span>Islamic Script<span className="studio-brand__line">Generator</span></span>
  </Link>;
}
