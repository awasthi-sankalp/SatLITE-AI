'use client';

import { useEffect } from 'react';

export default function BreakLoop() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      // If the URL contains this stale hash on the homepage, it's the dead loop.
      // Real SSO callbacks hit the physical /sso-callback route now.
      if (hash.includes('sso-callback')) {
        window.location.href = '/'; // Force a hard reload to the clean root URL
      }
    }
  }, []);

  return null;
}
