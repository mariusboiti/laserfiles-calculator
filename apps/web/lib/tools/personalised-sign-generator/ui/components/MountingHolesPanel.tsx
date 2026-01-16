'use client';

import React, { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import type { SignDocument, HoleMode, MountingHole } from '../../types/signPro';
import { Trash2, Plus } from 'lucide-react';

interface MountingHolesPanelProps {
  doc: SignDocument;
  onUpdateHoleConfig: (updates: Partial<SignDocument['holes']>) => void;
  onUpdateHolePosition: (holeId: string, xMm: number, yMm: number) => void;
  onAddHole: () => void;
  onDeleteHole: (holeId: string) => void;
}

export function MountingHolesPanel({
  doc,
  onUpdateHoleConfig,
  onUpdateHolePosition,
  onAddHole,
  onDeleteHole,
}: MountingHolesPanelProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const holes = doc.holes;

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-300">{t('personalised_sign.pro.mounting_holes.enable')}</label>
        <input
          type="checkbox"
          checked={holes.enabled}
          onChange={(e) => onUpdateHoleConfig({ enabled: e.target.checked })}
          className="w-4 h-4"
        />
      </div>

      {holes.enabled && (
        <>
          {/* Diameter */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.pro.mounting_holes.hole_diameter_mm')}</label>
            <input
              type="number"
              value={holes.diameterMm}
              onChange={(e) => onUpdateHoleConfig({ diameterMm: parseFloat(e.target.value) || 5 })}
              min={2}
              max={20}
              step={0.5}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
            />
          </div>

          {/* Mode */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.pro.mounting_holes.hole_mode')}</label>
            <select
              value={holes.mode}
              onChange={(e) => onUpdateHoleConfig({ mode: e.target.value as HoleMode })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
            >
              <option value="none">{t('personalised_sign.pro.mounting_holes.mode.none')}</option>
              <option value="one">{t('personalised_sign.pro.mounting_holes.mode.one_top_center')}</option>
              <option value="two">{t('personalised_sign.pro.mounting_holes.mode.two_top')}</option>
              <option value="four">{t('personalised_sign.pro.mounting_holes.mode.four_corners')}</option>
              <option value="custom">{t('personalised_sign.pro.mounting_holes.mode.custom')}</option>
            </select>
          </div>

          {/* Margin */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('personalised_sign.pro.mounting_holes.margin')}: {holes.marginMm}mm
            </label>
            <input
              type="range"
              value={holes.marginMm}
              onChange={(e) => onUpdateHoleConfig({ marginMm: parseFloat(e.target.value) })}
              min={0}
              max={150}
              step={1}
              className="w-full"
            />
          </div>

          {/* Mode-specific controls */}
          {holes.mode === 'two' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.pro.mounting_holes.spacing_x_mm')}</label>
                <input
                  type="number"
                  value={holes.spacingXmm}
                  onChange={(e) => onUpdateHoleConfig({ spacingXmm: parseFloat(e.target.value) || 0 })}
                  min={10}
                  max={doc.artboard.wMm}
                  step={5}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.pro.mounting_holes.offset_x_mm')}</label>
                  <input
                    type="number"
                    value={holes.offsetXmm}
                    onChange={(e) => onUpdateHoleConfig({ offsetXmm: parseFloat(e.target.value) || 0 })}
                    step={1}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.pro.mounting_holes.offset_y_mm')}</label>
                  <input
                    type="number"
                    value={holes.offsetYmm}
                    onChange={(e) => onUpdateHoleConfig({ offsetYmm: parseFloat(e.target.value) || 0 })}
                    step={1}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {holes.mode === 'four' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.pro.mounting_holes.inset_x_mm')}</label>
                <input
                  type="number"
                  value={holes.insetXmm}
                  onChange={(e) => onUpdateHoleConfig({ insetXmm: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={1}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.pro.mounting_holes.inset_y_mm')}</label>
                <input
                  type="number"
                  value={holes.insetYmm}
                  onChange={(e) => onUpdateHoleConfig({ insetYmm: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={1}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          )}

          {holes.mode === 'custom' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">
                  {t('personalised_sign.pro.mounting_holes.custom_holes')} ({holes.holes.length})
                </label>
                <button
                  onClick={onAddHole}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {t('personalised_sign.pro.mounting_holes.add_hole')}
                </button>
              </div>

              {holes.holes.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {holes.holes.map((hole, idx) => (
                    <div key={hole.id} className="bg-slate-900 rounded p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          {t('personalised_sign.pro.mounting_holes.hole')} {idx + 1}
                        </span>
                        <button
                          onClick={() => onDeleteHole(hole.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-0.5">{t('personalised_sign.pro.mounting_holes.x_mm')}</label>
                          <input
                            type="number"
                            value={Math.round(hole.xMm * 10) / 10}
                            onChange={(e) => onUpdateHolePosition(hole.id, parseFloat(e.target.value) || 0, hole.yMm)}
                            step={0.5}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-0.5">{t('personalised_sign.pro.mounting_holes.y_mm')}</label>
                          <input
                            type="number"
                            value={Math.round(hole.yMm * 10) / 10}
                            onChange={(e) => onUpdateHolePosition(hole.id, hole.xMm, parseFloat(e.target.value) || 0)}
                            step={0.5}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Show hole positions for non-custom modes */}
          {holes.mode !== 'none' && holes.mode !== 'custom' && holes.holes.length > 0 && (
            <div className="text-xs text-slate-500 bg-slate-900/50 rounded p-2">
              <div className="font-medium mb-1">{t('personalised_sign.pro.mounting_holes.generated_positions')}</div>
              {holes.holes.map((hole, idx) => (
                <div key={hole.id}>
                  {t('personalised_sign.pro.mounting_holes.hole')} {idx + 1}: ({Math.round(hole.xMm)}, {Math.round(hole.yMm)}) mm
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
