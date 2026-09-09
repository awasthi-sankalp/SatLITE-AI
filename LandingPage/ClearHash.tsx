'use client';

import { useEffect } from 'react';

export default function ClearHash() {
  useEffect(() => {
    // If there is any leftover hash from the Clerk SSO login process, clear it from the URL
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  return null;
}
