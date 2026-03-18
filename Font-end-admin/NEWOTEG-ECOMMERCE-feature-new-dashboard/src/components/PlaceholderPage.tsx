import React from 'react';
import { motion } from 'motion/react';

interface PlaceholderProps {
  title: string;
}

export const PlaceholderPage: React.FC<PlaceholderProps> = ({ title }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm"
    >
      <div className="size-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
        <span className="text-2xl font-bold">?</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-500 max-w-md">
        This section is currently under development. You'll be able to manage your {title.toLowerCase()} here soon.
      </p>
    </motion.div>
  );
};
