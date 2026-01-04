'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Upload, X, ChevronDown, Sparkles, Trash2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { ICON_PACK, ICON_CATEGORIES, searchIcons, getIconsByCategory, parseUploadedIcon, ICON_COUNT } from '../core/iconLibrary';
import { getMyIcons, saveMyIcon, deleteMyIcon, type MyIcon } from '../core/myIconsStorage';
import { cleanupSvg } from '../core/svgCleanup';
import { normalizePaths } from '../core/iconNormalize';
import { calculateLaserSafeScore, getLevelEmoji, getLevelColor, getLevelBgColor } from '../core/laserSafeScore';
import type { IconDef } from '../types';

type IconTab = 'pack' | 'my-icons' | 'ai';
type AIStyle = 'outline' | 'solid';
type AIComplexity = 'simple' | 'medium' | 'detailed';

interface IconPickerV2Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function IconPickerV2({ selectedId, onSelect }: IconPickerV2Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<IconTab>('pack');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // My Icons state
  const [myIcons, setMyIcons] = useState<MyIcon[]>([]);
  
  // AI Icon state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState<AIStyle>('outline');
  const [aiComplexity, setAiComplexity] = useState<AIComplexity>('simple');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTracing, setAiTracing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null); // dataUrl of generated image
  const [aiResult, setAiResult] = useState<{ svg: string; paths: string[] } | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
    
  // Load my icons on mount
  useEffect(() => {
    setMyIcons(getMyIcons());
  }, []);
  
  // Check AI configuration
  useEffect(() => {
    fetch('/api/ai/icon')
      .then(res => res.json())
      .then(data => setAiConfigured(data.configured))
      .catch(() => setAiConfigured(false));
  }, []);
  
  // Filtered icons for pack tab
  const filteredIcons = useMemo(() => {
    if (search.trim()) {
      return searchIcons(search);
    }
    if (activeCategory) {
      return getIconsByCategory(activeCategory);
    }
    return ICON_PACK;
  }, [search, activeCategory]);
  
  // Find selected icon
  const selectedIcon = useMemo(() => {
    if (!selectedId) return null;
    
    // Check pack
    const packIcon = ICON_PACK.find(i => i.id === selectedId);
    if (packIcon) return packIcon;
    
    // Check my icons
    const myIcon = myIcons.find(i => i.id === selectedId);
    if (myIcon) {
      return {
        id: myIcon.id,
        name: myIcon.name,
        category: myIcon.source,
        viewBox: '0 0 100 100',
        paths: myIcon.paths,
      } as IconDef;
    }
    
    return null;
  }, [selectedId, myIcons]);
  
  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const parsed = parseUploadedIcon(text);
      if (parsed) {
        // Normalize and save
        const normalizedPaths = normalizePaths(parsed.paths);
        const saved = saveMyIcon({
          name: file.name.replace(/\.svg$/i, ''),
          source: 'upload',
          svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${normalizedPaths.map(d => `<path d="${d}" fill="none" stroke="#000" stroke-width="2"/>`).join('')}</svg>`,
          paths: normalizedPaths,
        });
        setMyIcons(getMyIcons());
        onSelect(saved.id);
        setActiveTab('my-icons');
      }
    } catch {
      // Failed to parse
    }
    e.target.value = '';
  }, [onSelect]);
  
  // Handle AI generation - generates IMAGE only (no trace yet)
  const handleAiGenerate = useCallback(async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiLoading) return;
    
    setAiLoading(true);
    setAiError(null);
    setAiWarning(null);
    setAiImagePreview(null);
    setAiResult(null);
    
    try {
      const res = await fetch('/api/ai/icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: aiStyle,
          complexity: aiComplexity,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        const msg = [data?.error, data?.hint].filter(Boolean).join(' ');
        throw new Error(msg || 'Failed to generate icon');
      }
      
      if (data.warning) {
        setAiWarning(data.warning);
      }
      
      // Store image preview - trace will be done when user clicks "Add to Keychain"
      setAiImagePreview(data.dataUrl);
      
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate icon');
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiStyle, aiComplexity, aiLoading]);
  
  // Handle "Add to Keychain" - traces the image and saves as icon
  const handleAddToKeychain = useCallback(async () => {
    if (!aiImagePreview || aiTracing) return;
    
    setAiTracing(true);
    setAiError(null);
    
    try {
      // Call trace API - use ENGRAVE_LINEART to preserve internal details
      const traceRes = await fetch('/api/trace/potrace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: aiImagePreview,
          mode: 'ENGRAVE_LINEART',
          targetWidthMm: 100,
          targetHeightMm: 100,
          threshold: 128,
          denoise: 0,
          autoInvert: true,
        }),
      });
      
      const traceData = await traceRes.json();
      if (!traceRes.ok || !traceData?.ok) {
        throw new Error(traceData?.error || 'Trace failed');
      }
      
      const paths: string[] = traceData.paths || [];
      if (paths.length === 0) {
        throw new Error('No paths generated');
      }
      
      // Normalize paths to 0-100 viewBox
      const normalizedPaths = normalizePaths(paths);
      
      // Build SVG
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${normalizedPaths.map(d => `<path d="${d}" fill="#000"/>`).join('')}</svg>`;
      
      // Save to My Icons
      const saved = saveMyIcon({
        name: aiPrompt.slice(0, 30),
        source: 'ai',
        svg,
        paths: normalizedPaths,
        prompt: aiPrompt,
        style: aiStyle,
      });
      
      setMyIcons(getMyIcons());
      onSelect(saved.id);
      setAiImagePreview(null);
      setAiPrompt('');
      setActiveTab('my-icons');
      
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to trace icon');
    } finally {
      setAiTracing(false);
    }
  }, [aiImagePreview, aiTracing, aiPrompt, aiStyle, onSelect]);
  
  // Handle delete my icon
  const handleDeleteIcon = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteMyIcon(id)) {
      setMyIcons(getMyIcons());
      if (selectedId === id) {
        onSelect(null);
      }
    }
  }, [selectedId, onSelect]);
  
  return (
    <div className="space-y-2">
      <label className="block text-xs text-slate-400">
        Icon <span className="text-slate-500">({ICON_COUNT} + {myIcons.length} saved)</span>
      </label>
      
      {/* Selected icon preview */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 bg-slate-800 border border-slate-700 rounded cursor-pointer hover:border-slate-600"
      >
        {selectedIcon ? (
          <>
            <div className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded">
              <svg viewBox={selectedIcon.viewBox} className="w-6 h-6">
                {selectedIcon.paths.map((d, i) => (
                  <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="4" />
                ))}
              </svg>
            </div>
            <span className="text-sm flex-1">{selectedIcon.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(null); }}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-slate-500 flex-1">Select an icon...</span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </>
        )}
      </div>
      
      {/* Dropdown panel */}
      {isOpen && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('pack')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${activeTab === 'pack' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Icon Pack ({ICON_COUNT})
            </button>
            <button
              onClick={() => setActiveTab('my-icons')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${activeTab === 'my-icons' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              My Icons ({myIcons.length})
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${activeTab === 'ai' ? 'bg-purple-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles className="w-3 h-3" /> AI Icon
            </button>
          </div>
          
          <div className="p-3 max-h-[400px] overflow-y-auto">
            {/* Icon Pack Tab */}
            {activeTab === 'pack' && (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setActiveCategory(null); }}
                    placeholder="Search icons..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm"
                  />
                </div>
                
                {/* Categories */}
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => { setActiveCategory(null); setSearch(''); }}
                    className={`px-2 py-1 text-xs rounded transition-colors ${!activeCategory && !search ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    All
                  </button>
                  {ICON_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setActiveCategory(cat.id); setSearch(''); }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                
                {/* Icons grid */}
                <div className="grid grid-cols-8 gap-1">
                  {filteredIcons.map(icon => (
                    <button
                      key={icon.id}
                      onClick={() => { onSelect(icon.id); setIsOpen(false); }}
                      title={icon.name}
                      className={`aspect-square p-1.5 rounded flex items-center justify-center transition-colors ${selectedId === icon.id ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >
                      <svg viewBox={icon.viewBox} className="w-full h-full">
                        {icon.paths.map((d, i) => (
                          <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="5" />
                        ))}
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* My Icons Tab */}
            {activeTab === 'my-icons' && (
              <div className="space-y-3">
                {myIcons.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    <p>No saved icons yet.</p>
                    <p className="text-xs mt-1">Upload SVG or generate with AI.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-2">
                    {myIcons.map(icon => (
                      <div key={icon.id} className="relative group">
                        <button
                          onClick={() => { onSelect(icon.id); setIsOpen(false); }}
                          title={icon.name}
                          className={`w-full aspect-square p-1.5 rounded flex items-center justify-center transition-colors ${selectedId === icon.id ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            {icon.paths.map((d, i) => (
                              <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="5" />
                            ))}
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDeleteIcon(icon.id, e)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="absolute -bottom-0.5 left-0 right-0 flex justify-center">
                          <span className={`text-[9px] px-1 rounded ${icon.source === 'ai' ? 'bg-purple-600' : 'bg-slate-600'}`}>
                            {icon.source === 'ai' ? 'AI' : 'UP'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Upload button */}
                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded cursor-pointer text-xs transition-colors">
                  <Upload className="w-4 h-4" />
                  Upload SVG Icon
                  <input type="file" accept=".svg" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            )}
            
            {/* AI Icon Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-3">
                {/* Warning note */}
                <div className="bg-slate-900 rounded p-2 text-xs text-slate-400">
                  <AlertTriangle className="w-3 h-3 inline mr-1 text-yellow-500" />
                  Don't request copyrighted logos. Generate generic icons unless you own rights.
                </div>
                
                {aiConfigured === false && (
                  <div className="bg-red-900/30 border border-red-700 rounded p-3 text-xs text-red-300">
                    AI icon generation not configured. Set AI_API_KEY or OPENAI_API_KEY in environment.
                  </div>
                )}
                
                {/* Prompt */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Describe your icon</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value.slice(0, 200))}
                    placeholder="e.g., cute gamepad icon, minimal heart with wings..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm resize-none h-16"
                    disabled={aiLoading}
                  />
                  <div className="text-right text-xs text-slate-500">{aiPrompt.length}/200</div>
                </div>
                
                {/* Style & Complexity */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Style</label>
                    <select
                      value={aiStyle}
                      onChange={(e) => setAiStyle(e.target.value as AIStyle)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs"
                      disabled={aiLoading}
                    >
                      <option value="outline">Outline (cut lines)</option>
                      <option value="solid">Solid (engrave fill)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Complexity</label>
                    <select
                      value={aiComplexity}
                      onChange={(e) => setAiComplexity(e.target.value as AIComplexity)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs"
                      disabled={aiLoading}
                    >
                      <option value="simple">Simple</option>
                      <option value="medium">Medium</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </div>
                </div>
                
                {/* Laser-ready checklist */}
                <div className="bg-slate-900/50 rounded p-2 text-xs text-slate-500">
                  <div className="font-medium text-slate-400 mb-1">Laser-ready output:</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>✓ Black on white</span>
                    <span>✓ Centered</span>
                    <span>✓ No text</span>
                    <span>✓ Vector traced</span>
                  </div>
                </div>
                
                {/* Generate button */}
                <button
                  onClick={() => handleAiGenerate()}
                  disabled={!aiPrompt.trim() || aiLoading || aiConfigured === false}
                  className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Generate Icon
                    </>
                  )}
                </button>
                
                {/* Error */}
                {aiError && (
                  <div className="bg-red-900/30 border border-red-700 rounded p-2 text-xs text-red-300">
                    {aiError}
                    <button
                      onClick={() => setAiError(null)}
                      className="ml-2 underline hover:no-underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                
                {/* Warning */}
                {aiWarning && (
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded p-2 text-xs text-yellow-300">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {aiWarning}
                  </div>
                )}
                
                {/* Image Preview - shows generated image before tracing */}
                {aiImagePreview && (
                  <div className="space-y-2">
                    <div className="bg-white rounded p-4 flex items-center justify-center">
                      <img
                        src={aiImagePreview}
                        alt="Generated icon"
                        className="w-24 h-24 object-contain"
                      />
                    </div>
                    
                    <div className="text-xs text-slate-400 text-center">
                      Preview - click below to trace and add
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddToKeychain}
                        disabled={aiTracing}
                        className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {aiTracing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Tracing...
                          </>
                        ) : (
                          'Add to Keychain'
                        )}
                      </button>
                      <button
                        onClick={() => handleAiGenerate()}
                        disabled={aiLoading || aiTracing}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Regen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
