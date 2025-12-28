'use client';

import { forwardRef, useImperativeHandle } from 'react';
import EngravePrepApp from '../App';
import { useImageStore } from '../store/useImageStore';

export interface EngravePrepToolRef {
  reset: () => void;
}

export const EngravePrepTool = forwardRef<EngravePrepToolRef>((props, ref) => {
  const reset = useImageStore((state) => state.reset);

  useImperativeHandle(ref, () => ({
    reset,
  }));

  return <EngravePrepApp />;
});

EngravePrepTool.displayName = 'EngravePrepTool';
