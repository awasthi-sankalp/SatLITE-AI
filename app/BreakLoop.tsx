'use client';

import { useEffect } from 'react';

export default function BreakLoop() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('sso-callback')) {
        window.location.href = '/'; 
      }
    }
  }, []);

  return null;
}



