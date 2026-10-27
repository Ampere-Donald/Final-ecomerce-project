import { Pause, Play } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useMotionPreferences } from './motionPreferences';

export default function MotionToggle() {
  const { ready, reduced, paused, toggle } = useMotionPreferences();
  const { lang } = useI18n();
  const text = (fr, en) => lang === 'fr' ? fr : en;
  return <button type="button" className="e-motion-toggle" disabled={!ready || reduced}
    aria-pressed={paused || reduced} onClick={toggle}>
    {paused || reduced ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
    {reduced ? text('Mouvements réduits (système)', 'Reduced motion (system)') : paused
      ? text('Réactiver les animations', 'Enable animations') : text('Mettre les animations en pause', 'Pause animations')}
  </button>;
}
