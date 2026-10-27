import { useEffect, useState } from 'react';
import { getEvidenceUrls } from '@/lib/storageService';

/**
 * Resolves evidence storage keys to short-lived viewable URLs. Keys that are not
 * resolved yet are missing from the map, so callers can show a placeholder.
 */
export function useEvidenceUrls(keys: string[] = []): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const signature = keys.join('|');

  useEffect(() => {
    if (!signature) {
      setUrls({});
      return;
    }
    let active = true;
    getEvidenceUrls(signature.split('|'))
      .then((resolved) => {
        if (active) setUrls(resolved);
      })
      .catch((error) => console.warn('Could not load evidence links:', error));
    return () => {
      active = false;
    };
  }, [signature]);

  return urls;
}
