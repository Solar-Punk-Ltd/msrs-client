import { RefObject, useEffect } from 'react';

export function useClickOutside(refs: RefObject<HTMLElement>[], handler: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      const clickedOutside = refs.every((ref) => ref.current && !ref.current.contains(event.target as Node));

      if (clickedOutside) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, handler, enabled]);
}
