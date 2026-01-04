'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Download, Eye, EyeOff } from 'lucide-react';
import { getStoredEvents, getEventStats, clearEvents, enableDevAnalytics, disableDevAnalytics, isAnalyticsEnabled, type Event } from '@/lib/analytics/trackEvent';

interface AnalyticsViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsViewer({ isOpen, onClose }: AnalyticsViewerProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Record<string, Record<string, number>>>({});
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAnalytics();
    }
  }, [isOpen]);

  const loadAnalytics = () => {
    setEvents(getStoredEvents().events);
    setStats(getEventStats());
    setIsEnabled(isAnalyticsEnabled());
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all analytics data?')) {
      clearEvents();
      loadAnalytics();
    }
  };

  const handleExport = () => {
    const data = {
      version: 1,
      events,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lfp-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleAnalytics = () => {
    if (isEnabled) {
      disableDevAnalytics();
    } else {
      enableDevAnalytics();
    }
    setIsEnabled(!isEnabled);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Analytics Viewer (Dev Only)</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Status:</span>
                <span className={`text-sm font-medium ${isEnabled ? 'text-green-400' : 'text-red-400'}`}>
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <button
                onClick={toggleAnalytics}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
              >
                {isEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {isEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Events: {events.length}</span>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {/* Stats Table */}
          <div className="p-4">
            <h3 className="text-lg font-medium text-white mb-3">Usage Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-300">Tool</th>
                    <th className="text-center py-2 px-3 text-slate-300">Open</th>
                    <th className="text-center py-2 px-3 text-slate-300">Action</th>
                    <th className="text-center py-2 px-3 text-slate-300">AI Gen</th>
                    <th className="text-center py-2 px-3 text-slate-300">Export</th>
                    <th className="text-center py-2 px-3 text-slate-300">Save</th>
                    <th className="text-center py-2 px-3 text-slate-300">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats).map(([tool, counts]) => {
                    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
                    return (
                      <tr key={tool} className="border-b border-slate-800">
                        <td className="py-2 px-3 text-white font-medium">{tool}</td>
                        <td className="text-center py-2 px-3 text-slate-300">{counts.tool_open || 0}</td>
                        <td className="text-center py-2 px-3 text-slate-300">{counts.tool_action || 0}</td>
                        <td className="text-center py-2 px-3 text-slate-300">{counts.ai_generate || 0}</td>
                        <td className="text-center py-2 px-3 text-slate-300">{counts.tool_export || 0}</td>
                        <td className="text-center py-2 px-3 text-slate-300">{counts.ai_save || 0}</td>
                        <td className="text-center py-2 px-3 text-white font-medium">{total}</td>
                      </tr>
                    );
                  })}
                  {Object.keys(stats).length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-slate-400">
                        No events recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Events */}
          <div className="p-4 border-t border-slate-700">
            <h3 className="text-lg font-medium text-white mb-3">Recent Events (Last 20)</h3>
            <div className="space-y-1">
              {events.slice(-20).reverse().map((event, index) => (
                <div key={index} className="flex items-center gap-4 text-sm py-1 px-2 rounded bg-slate-800/50">
                  <span className="text-slate-400 font-mono text-xs">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-white font-medium">{event.toolSlug}</span>
                  <span className="text-slate-300">{event.type}</span>
                  {'action' in event && (
                    <span className="text-blue-400">{event.action}</span>
                  )}
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center py-4 text-slate-400">
                  No events recorded yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
