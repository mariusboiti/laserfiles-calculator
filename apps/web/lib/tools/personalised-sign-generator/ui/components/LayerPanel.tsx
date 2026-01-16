'use client';

/**
 * Personalised Sign Generator V3 PRO - Layer Panel
 * Manage layers with visibility, opacity, lock, and reorder
 */

import React, { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Layers,
  Download,
  DownloadCloud,
} from 'lucide-react';
import type { SignDocument, Layer, LayerType, Element } from '../../types/signPro';

interface LayerPanelProps {
  document: SignDocument;
  selectedIds: string[];
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onAddLayer: (type: LayerType, name: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onSelectLayer: (layerId: string) => void;
  onSelectElement: (elementId: string) => void;
  onMoveElementToLayerType: (elementId: string, targetLayerType: 'CUT' | 'ENGRAVE') => void;
}

const LAYER_COLORS: Record<LayerType, string> = {
  BASE: 'bg-slate-500',
  CUT: 'bg-red-500',
  ENGRAVE: 'bg-blue-500',
  OUTLINE: 'bg-purple-500',
  GUIDE: 'bg-green-500',
};

const LAYER_ICONS: Record<LayerType, string> = {
  BASE: '□',
  CUT: '✂',
  ENGRAVE: '≡',
  OUTLINE: '◯',
  GUIDE: '⋯',
};

export function LayerPanel({
  document,
  selectedIds,
  onUpdateLayer,
  onReorderLayers,
  onAddLayer,
  onDeleteLayer,
  onSelectLayer,
  onSelectElement,
  onMoveElementToLayerType,
}: LayerPanelProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const sortedLayers = [...document.layers].sort((a, b) => b.order - a.order);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Layers className="w-4 h-4" />
          {t('personalised_sign.pro.layers.title')}
        </div>
        <AddLayerButton onAdd={onAddLayer} t={t} />
      </div>

      {/* Layer list */}
      <div className="divide-y divide-slate-700/50">
        {sortedLayers.map((layer, index) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isActive={layer.id === document.activeLayerId}
            selectedIds={selectedIds}
            t={t}
            canMoveUp={index > 0}
            canMoveDown={index < sortedLayers.length - 1}
            canDelete={layer.type !== 'BASE'}
            onUpdate={(updates) => onUpdateLayer(layer.id, updates)}
            onMoveUp={() => {
              const actualIndex = document.layers.findIndex(l => l.id === layer.id);
              const targetIndex = document.layers.findIndex(l => l.id === sortedLayers[index - 1].id);
              onReorderLayers(actualIndex, targetIndex);
            }}
            onMoveDown={() => {
              const actualIndex = document.layers.findIndex(l => l.id === layer.id);
              const targetIndex = document.layers.findIndex(l => l.id === sortedLayers[index + 1].id);
              onReorderLayers(actualIndex, targetIndex);
            }}
            onDelete={() => onDeleteLayer(layer.id)}
            onSelect={() => onSelectLayer(layer.id)}
            onSelectElement={onSelectElement}
            onMoveElementToLayerType={onMoveElementToLayerType}
          />
        ))}
      </div>
    </div>
  );
}

interface LayerItemProps {
  layer: Layer;
  isActive: boolean;
  selectedIds: string[];
  t: (key: string) => string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
  onUpdate: (updates: Partial<Layer>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onSelectElement: (elementId: string) => void;
  onMoveElementToLayerType: (elementId: string, targetLayerType: 'CUT' | 'ENGRAVE') => void;
}

function LayerItem({
  layer,
  isActive,
  selectedIds,
  t,
  canMoveUp,
  canMoveDown,
  canDelete,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSelect,
  onSelectElement,
  onMoveElementToLayerType,
}: LayerItemProps) {
  return (
    <div
      className={`p-2 transition-colors ${
        isActive ? 'bg-blue-600/20' : 'hover:bg-slate-700/50'
      }`}
    >
      {/* Main row */}
      <div className="flex items-center gap-2">
        {/* Type indicator */}
        <div
          className={`w-2 h-2 rounded-full ${LAYER_COLORS[layer.type]}`}
          title={layer.type}
        />

        {/* Name (clickable) */}
        <button
          onClick={onSelect}
          className="flex-1 text-left text-sm truncate text-slate-200 hover:text-white"
        >
          {layer.name}
        </button>

        {/* Quick controls */}
        <div className="flex items-center gap-1">
          {/* Visibility */}
          <button
            onClick={() => onUpdate({ visible: !layer.visible })}
            className="p-1 rounded hover:bg-slate-600"
            title={layer.visible ? t('personalised_sign.pro.layers.hide') : t('personalised_sign.pro.layers.show')}
          >
            {layer.visible ? (
              <Eye className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {/* Lock */}
          <button
            onClick={() => onUpdate({ locked: !layer.locked })}
            className="p-1 rounded hover:bg-slate-600"
            title={layer.locked ? t('personalised_sign.pro.layers.unlock') : t('personalised_sign.pro.layers.lock')}
          >
            {layer.locked ? (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Export */}
          <button
            onClick={() => onUpdate({ exportEnabled: !layer.exportEnabled })}
            className="p-1 rounded hover:bg-slate-600"
            title={layer.exportEnabled ? t('personalised_sign.pro.layers.exclude_from_export') : t('personalised_sign.pro.layers.include_in_export')}
          >
            {layer.exportEnabled ? (
              <Download className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <DownloadCloud className="w-3.5 h-3.5 text-slate-500 opacity-50" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded controls when active */}
      {isActive && (
        <div className="mt-2 pl-4 space-y-2">
          {/* Opacity slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-14">{t('personalised_sign.pro.layers.opacity')}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(layer.opacity * 100)}
              onChange={(e) => onUpdate({ opacity: Number(e.target.value) / 100 })}
              className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-slate-400 w-8 text-right">
              {Math.round(layer.opacity * 100)}%
            </span>
          </div>

          {/* Reorder and delete */}
          <div className="flex items-center gap-1">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="p-1 rounded hover:bg-slate-600 disabled:opacity-30"
              title={t('personalised_sign.pro.layers.move_up')}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="p-1 rounded hover:bg-slate-600 disabled:opacity-30"
              title={t('personalised_sign.pro.layers.move_down')}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            {canDelete && (
              <button
                onClick={onDelete}
                className="p-1 rounded hover:bg-red-600/50 ml-auto"
                title={t('personalised_sign.pro.layers.delete_layer')}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            )}
          </div>

          {/* Element count */}
          <div className="text-xs text-slate-500">
            {layer.elements.length}{' '}
            {layer.elements.length !== 1
              ? t('personalised_sign.pro.layers.elements_plural')
              : t('personalised_sign.pro.layers.elements_singular')}
          </div>

          {layer.elements.length > 0 && (
            <div className="space-y-1">
              {layer.elements.map((el) => (
                (() => {
                  const supportsCutEngrave = el.kind !== 'engraveImage' && el.kind !== 'engraveSketch';
                  return (
                <LayerElementRow
                  key={el.id}
                  element={el}
                  isSelected={selectedIds.includes(el.id)}
                  disableMoveToCut={layer.locked || !supportsCutEngrave}
                  disableMoveToEngrave={layer.locked || !supportsCutEngrave}
                  t={t}
                  onSelect={() => onSelectElement(el.id)}
                  onMoveToCut={() => onMoveElementToLayerType(el.id, 'CUT')}
                  onMoveToEngrave={() => onMoveElementToLayerType(el.id, 'ENGRAVE')}
                />
                  );
                })()
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getElementLabel(el: Element, t: (key: string) => string): string {
  switch (el.kind) {
    case 'text':
      return el.text?.trim()
        ? `${t('personalised_sign.pro.layers.element_label.text_prefix')} ${el.text.trim()}`
        : t('personalised_sign.pro.layers.element_label.text');
    case 'shape':
      return t('personalised_sign.pro.layers.element_label.shape');
    case 'ornament':
      return `${t('personalised_sign.pro.layers.element_label.ornament_prefix')} ${el.assetId}`;
    case 'engraveSketch':
      return t('personalised_sign.pro.layers.element_label.sketch');
    case 'engraveImage':
      return t('personalised_sign.pro.layers.element_label.image');
    case 'tracedPath':
      return t('personalised_sign.pro.layers.element_label.trace');
    case 'tracedPathGroup':
      return t('personalised_sign.pro.layers.element_label.trace_group');
    default:
      return t('personalised_sign.pro.layers.element_label.element');
  }
}

function LayerElementRow({
  element,
  isSelected,
  disableMoveToCut,
  disableMoveToEngrave,
  t,
  onSelect,
  onMoveToCut,
  onMoveToEngrave,
}: {
  element: Element;
  isSelected: boolean;
  disableMoveToCut: boolean;
  disableMoveToEngrave: boolean;
  t: (key: string) => string;
  onSelect: () => void;
  onMoveToCut: () => void;
  onMoveToEngrave: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded px-2 py-1 ${
        isSelected ? 'bg-blue-600/20' : 'hover:bg-slate-700/50'
      }`}
    >
      <button
        onClick={onSelect}
        className="flex-1 text-left text-xs truncate text-slate-300 hover:text-white"
        title={getElementLabel(element, t)}
      >
        {getElementLabel(element, t)}
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={onMoveToCut}
          disabled={disableMoveToCut}
          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 hover:bg-slate-600 disabled:opacity-30"
          title={t('personalised_sign.pro.layers.move_to_cut')}
        >
          {t('personalised_sign.ai.layer_cut')}
        </button>
        <button
          onClick={onMoveToEngrave}
          disabled={disableMoveToEngrave}
          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 hover:bg-slate-600 disabled:opacity-30"
          title={t('personalised_sign.pro.layers.move_to_engrave')}
        >
          {t('personalised_sign.ai.layer_engrave')}
        </button>
      </div>
    </div>
  );
}

interface AddLayerButtonProps {
  onAdd: (type: LayerType, name: string) => void;
  t: (key: string) => string;
}

function AddLayerButton({ onAdd, t }: AddLayerButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const layerTypes: { type: LayerType; label: string }[] = [
    { type: 'ENGRAVE', label: t('personalised_sign.pro.layers.layer_type.engrave') },
    { type: 'CUT', label: t('personalised_sign.pro.layers.layer_type.cut') },
    { type: 'OUTLINE', label: t('personalised_sign.pro.layers.layer_type.outline') },
    { type: 'GUIDE', label: t('personalised_sign.pro.layers.layer_type.guide') },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-slate-700"
        title={t('personalised_sign.pro.layers.add_layer')}
      >
        <Plus className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[140px]">
            {layerTypes.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => {
                  onAdd(type, label);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-slate-700 flex items-center gap-2"
              >
                <div className={`w-2 h-2 rounded-full ${LAYER_COLORS[type]}`} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LayerPanel;
