'use client';

/**
 * CanvasToolbar - Toolbar for canvas editor controls
 * Tool selection, zoom, view options
 */

import React from 'react';
import {
  Undo2,
  Redo2,
  MousePointer2,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Shield,
  Crosshair,
  Magnet,
} from 'lucide-react';
import type { CanvasTool } from './CanvasStage';

interface CanvasToolbarProps {
  activeTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showSafeZones: boolean;
  onToggleSafeZones: () => void;
  showGuides: boolean;
  onToggleGuides: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
}

export function CanvasToolbar({
  activeTool,
  onToolChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  showGrid,
  onToggleGrid,
  showSafeZones,
  onToggleSafeZones,
  showGuides,
  onToggleGuides,
  snapEnabled,
  onToggleSnap,
}: CanvasToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-800 border-b border-slate-700 min-w-0">
      {/* Left group */}
      <div className="flex flex-wrap items-center gap-1 min-w-0">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-600">
        <ToolButton
          icon={<Undo2 className="w-4 h-4" />}
          label="Undo (Ctrl/Cmd+Z)"
          active={false}
          onClick={() => onUndo && onUndo()}
          disabled={!canUndo || !onUndo}
        />
        <ToolButton
          icon={<Redo2 className="w-4 h-4" />}
          label="Redo (Shift+Ctrl/Cmd+Z)"
          active={false}
          onClick={() => onRedo && onRedo()}
          disabled={!canRedo || !onRedo}
        />
        </div>

        {/* Tool selection */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-600">
        <ToolButton
          icon={<MousePointer2 className="w-4 h-4" />}
          label="Select (V)"
          active={activeTool === 'select'}
          onClick={() => onToolChange('select')}
        />
        <ToolButton
          icon={<Hand className="w-4 h-4" />}
          label="Pan (Space)"
          active={activeTool === 'pan'}
          onClick={() => onToolChange('pan')}
        />
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 px-2 border-r border-slate-600">
        <ToolButton
          icon={<ZoomOut className="w-4 h-4" />}
          label="Zoom Out (-)"
          onClick={onZoomOut}
        />
        <div className="w-14 text-center text-xs text-slate-300 font-mono">
          {Math.round(zoom * 100)}%
        </div>
        <ToolButton
          icon={<ZoomIn className="w-4 h-4" />}
          label="Zoom In (+)"
          onClick={onZoomIn}
        />
        <ToolButton
          icon={<Maximize className="w-4 h-4" />}
          label="Fit View (0)"
          onClick={onFitView}
        />
        </div>

        {/* View options */}
        <div className="flex items-center gap-1 px-2 border-r border-slate-600">
        <ToolButton
          icon={<Grid className="w-4 h-4" />}
          label="Toggle Grid (G)"
          active={showGrid}
          onClick={onToggleGrid}
        />
        <ToolButton
          icon={<Shield className="w-4 h-4" />}
          label="Safe Zones (S)"
          active={showSafeZones}
          onClick={onToggleSafeZones}
        />
        <ToolButton
          icon={<Crosshair className="w-4 h-4" />}
          label="Guides (;)"
          active={showGuides}
          onClick={onToggleGuides}
        />
        </div>

        {/* Snap toggle */}
        <div className="flex items-center gap-1 px-2">
        <ToolButton
          icon={<Magnet className="w-4 h-4" />}
          label="Snap to Grid"
          active={snapEnabled}
          onClick={onToggleSnap}
        />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-[8px]" />

      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-slate-500 px-2 whitespace-nowrap">
        Hold <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">Space</kbd> to pan
      </div>
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ToolButton({ icon, label, active, onClick, disabled }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`p-2 rounded transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-700'
      }`}
    >
      {icon}
    </button>
  );
}
