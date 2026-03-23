import React from 'react';

/**
 * Safely renders text that contains <strong>...</strong> tags
 * without using dangerouslySetInnerHTML.
 */
export function renderBoldText(text) {
  if (!text) return null;
  const parts = text.split(/(<strong>.*?<\/strong>)/g);
  return parts.map((part, i) => {
    const match = part.match(/<strong>(.*?)<\/strong>/);
    if (match) return <strong key={i}>{match[1]}</strong>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
