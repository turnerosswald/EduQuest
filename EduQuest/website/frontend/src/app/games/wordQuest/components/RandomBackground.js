import React from 'react';
import './styles.css';

// Kept for compatibility with older WordQuest imports. The original random
// /images/1.jpg ... /images/36.jpg assets are not in EduQuest's public folder.
export default function RandomBackground() {
  return <div className="wordquest__random-background" aria-hidden="true" />;
}
