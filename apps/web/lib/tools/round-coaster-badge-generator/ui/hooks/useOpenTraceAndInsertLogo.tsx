'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { TraceModal, type TraceModalResult } from '@/components/trace/TraceModal';

export function useOpenTraceAndInsertLogo(args: {
  defaultTargetWidthMm: number;
  onInsert: (result: TraceModalResult) => void;
}) {
  const [open, setOpen] = useState(false);

  const defaultTargetWidthMm = args.defaultTargetWidthMm;

  const handleInsert = useCallback(
    (result: TraceModalResult) => {
      args.onInsert(result);
      setOpen(false);
    },
    [args]
  );

  const modal = useMemo(() => {
    return (
      <TraceModal
        open={open}
        defaultTargetWidthMm={defaultTargetWidthMm}
        onClose={() => setOpen(false)}
        onTraced={handleInsert}
      />
    );
  }, [open, defaultTargetWidthMm, handleInsert]);

  return {
    openTrace: () => setOpen(true),
    closeTrace: () => setOpen(false),
    TraceModal: modal,
    isOpen: open,
  };
}
