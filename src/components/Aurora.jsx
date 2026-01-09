import { useEffect } from 'react';
import { motion } from 'framer-motion';
import './aurora.css';

export default function Aurora({ colors = { primary: '#4c1d95', secondary: '#2e1065' } }) {
  useEffect(() => {
    // Expose CSS variables for gradient and allow dynamic updates
    const root = document.documentElement;
    root.style.setProperty('--primary-color', colors.primary);
    root.style.setProperty('--secondary-color', colors.secondary);
  }, [colors]);

  // Multiple layers for depth, animated with framer-motion + CSS
  return (
    <div className="aurora-root pointer-events-none" aria-hidden>
      <motion.div
        className="aurora-layer layer-1"
        animate={{ rotate: [0, 45, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="aurora-layer layer-2"
        animate={{ rotate: [0, -30, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <div className="aurora-mesh" />
    </div>
  );
}
