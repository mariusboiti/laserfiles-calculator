'use client';

/**
 * Personalised Sign Generator V3 PRO - Layer Panel
 * Manage layers with visibility, opacity, lock, and reorder
 */

import React from 'react';
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
import type { SignDocument, Layer, LayerType } from '../../types/signPro';

interface LayerPanelProps {
  document: SignDocument;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onAddLayer: (type: LayerType, name: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onSelectLayer: (layerId: string) => void;
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
  onUpdateLayer,
  onReorderLayers,
  onAddLayer,
  onDeleteLayer,
  onSelectLayer,
}: LayerPanelProps) {
  const sortedLayers = [...document.layers].sort((a, b) => b.order - a.order);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Layers className="w-4 h-4" />
          Layers
        </div>
        <AddLayerButton onAdd={onAddLayer} />
      </div>

      {/* Layer list */}
      <div className="divide-y divide-slate-700/50">
        {sortedLayers.map((layer, index) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isActive={layer.id === document.activeLayerId}
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
          />
        ))}
      </div>
    </div>
  );
}

interface LayerItemProps {
  layer: Layer;
  isActive: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
  onUpdate: (updates: Partial<Layer>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

function LayerItem({
  layer,
  isActive,
  canMoveUp,
  canMoveDown,
  canDelete,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSelect,
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
            title={layer.visible ? 'Hide' : 'Show'}
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
            title={layer.locked ? 'Unlock' : 'Lock'}
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
            title={layer.exportEnabled ? 'Exclude from export' : 'Include in export'}
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
            <span className="text-xs text-slate-400 w-14">Opacity</span>
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
              title="Move up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="p-1 rounded hover:bg-slate-600 disabled:opacity-30"
              title="Move down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            {canDelete && (
              <button
                onClick={onDelete}
                className="p-1 rounded hover:bg-red-600/50 ml-auto"
                title="Delete layer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            )}
          </div>

          {/* Element count */}
          <div className="text-xs text-slate-500">
            {layer.elements.length} element{layer.elements.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

interface AddLayerButtonProps {
  onAdd: (type: LayerType, name: string) => void;
}

function AddLayerButton({ onAdd }: AddLayerButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const layerTypes: { type: LayerType; label: string }[] = [
    { type: 'ENGRAVE', label: 'Engrave Layer' },
    { type: 'CUT', label: 'Cut Layer' },
    { type: 'OUTLINE', label: 'Outline Layer' },
    { type: 'GUIDE', label: 'Guide Layer' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-slate-700"
        title="Add layer"
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
