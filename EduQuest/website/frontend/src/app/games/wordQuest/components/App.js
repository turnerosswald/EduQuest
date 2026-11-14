'use client';
import React from 'react';
import HomePage from './HomePage';
import { PointsProvider } from './PointsContext';
import './styles.css';

export default function App() {
  return (
    <PointsProvider>
      <main className="wordquest">
        <div className="wordquest__backdrop" aria-hidden="true" />
        <div className="wordquest__content"><HomePage /></div>
      </main>
    </PointsProvider>
  );
}
