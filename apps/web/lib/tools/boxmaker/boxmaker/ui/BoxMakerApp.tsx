'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BoxType } from '../core/types';
import { SimpleBoxUI } from './panels/SimpleBoxUI';
import { HingedBoxUI } from './panels/HingedBoxUI-PURE';
import { SlidingDrawerUI } from './panels/SlidingDrawerUI';
import { HingedLidPinUI } from './panels/HingedLidPinUI';
import { HingedSidePinUI } from './panels/HingedSidePinUI';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { useUnitSystem } from '@/components/units/UnitSystemProvider';

interface BoxMakerAppProps {
  onResetCallback?: (callback: () => void) => void;
}

export default function BoxMakerApp({ onResetCallback }: BoxMakerAppProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const [boxType, setBoxType] = useState<BoxType>(BoxType.simple);
  const { unitSystem, setUnitSystem } = useUnitSystem();
  const resetFnRef = useRef<(() => void) | null>(null);

  // Register reset callback with parent
  useEffect(() => {
    if (onResetCallback && resetFnRef.current) {
      onResetCallback(resetFnRef.current);
    }
  }, [onResetCallback, boxType]);

  const boxTypeSelector = (
    <div className="grid gap-3">
      <label className="grid gap-1">
        <div className="text-[11px] text-slate-400">{t('boxmaker.box_type')}</div>
        <select
          className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
          value={boxType}
          onChange={(e) => setBoxType(e.target.value as BoxType)}
        >
          <option value="simple-box">{t('boxmaker.type.simple')}</option>
          <option value="hinged-box">{t('boxmaker.type.hinged')}</option>
          <option value="sliding-drawer">{t('boxmaker.type.sliding_drawer')}</option>
        </select>
      </label>

      <div className="grid gap-1">
        <div className="text-[11px] text-slate-400">{t('boxmaker.units')}</div>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-800 bg-slate-950">
          <button
            type="button"
            onClick={() => setUnitSystem('mm')}
            className={
              unitSystem === 'mm'
                ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
                : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
            }
          >
            mm
          </button>
          <button
            type="button"
            onClick={() => setUnitSystem('in')}
            className={
              unitSystem === 'in'
                ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
                : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
            }
          >
            in
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="lfs-tool lfs-tool-boxmaker relative">
      {boxType === BoxType.simple ? (
        <SimpleBoxUI
          boxTypeSelector={boxTypeSelector}
          unitSystem={unitSystem}
          onResetCallback={(fn) => {
            resetFnRef.current = fn;
          }}
        />
      ) : boxType === BoxType.hinged ? (
        <HingedBoxUI 
          boxTypeSelector={boxTypeSelector}
          unitSystem={unitSystem}
          onResetCallback={(fn) => { resetFnRef.current = fn; }}
        />
      ) : (
        <SlidingDrawerUI 
          boxTypeSelector={boxTypeSelector}
          unitSystem={unitSystem}
          onResetCallback={(fn) => { resetFnRef.current = fn; }}
        />
      )}
    </div>
  );
}
