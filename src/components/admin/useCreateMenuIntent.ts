'use client';

import * as React from 'react';

export function useCreateMenuIntent(onOpen: () => void, queryKey = 'new') {
  const onOpenRef = React.useRef(onOpen);
  onOpenRef.current = onOpen;

  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(queryKey) !== '1') return;

    url.searchParams.delete(queryKey);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    onOpenRef.current();
  }, [queryKey]);
}
