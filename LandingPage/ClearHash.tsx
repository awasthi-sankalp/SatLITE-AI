'use client';

import { useEffect } from 'react';

export default function ClearHash() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  return null;
}

