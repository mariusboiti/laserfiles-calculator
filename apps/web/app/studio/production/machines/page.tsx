'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Monitor, Plus, Wifi, WifiOff, Zap, Trash2, Edit2, Save, X,
  RefreshCw, AlertTriangle, CheckCircle, ArrowLeft, Loader2, Signal,
} from 'lucide-react';

interface Machine {
  id: string; name: string;
  machineType: string | null; connectionType: string | null;
  connectionStatus: string; ipAddress: string | null; port: number | null;
  bedWidthMm: number | null; bedHeightMm: number | null;
  maxPowerW: number | null; maxSpeedMmS: number | null;
  accelerationMmS2: number | null; homePosition: string | null;
  firmwareVersion: string | null; lastPingAt: string | null;
  hourlyCost: number | null;
  _count?: { laserJobs: number };
}

const MACHINE_TYPES = ['DIODE', 'CO2', 'FIBER', 'GALVO'] as const;
const CONNECTION_TYPES = ['GRBL', 'LIGHTBURN_BRIDGE', 'RUIDA', 'GLOWFORGE_CLOUD', 'MANUAL'] as const;

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<Record<string, 'loading' | 'ok' | 'fail'>>({});
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const uid = res.data?.user?.id;
      setUserId(uid);
      return uid;
    } catch { return null; }
  }, []);

  const fetchMachines = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/laser-machines');
      setMachines(res.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchUser();
      await fetchMachines();
    })();
  }, [fetchUser, fetchMachines]);

  const handlePing = async (id: string) => {
    setPingStatus(s => ({ ...s, [id]: 'loading' }));
    try {
      await apiClient.post(`/laser-machines/${id}/ping`);
      setPingStatus(s => ({ ...s, [id]: 'ok' }));
      await fetchMachines();
    } catch {
      setPingStatus(s => ({ ...s, [id]: 'fail' }));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this machine profile?')) return;
    try {
      await apiClient.delete(`/laser-machines/${id}`);
      await fetchMachines();
    } catch {}
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/studio/production" className="mb-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
            <ArrowLeft className="h-3 w-3" /> Production Dashboard
          </a>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Monitor className="h-7 w-7 text-sky-400" /> Laser Machines
          </h1>
          <p className="mt-1 text-sm text-slate-500">Configure and manage your laser machine connections</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors">
          <Plus className="h-4 w-4" /> Add Machine
        </button>
      </div>

      {/* Add Machine Form */}
      {showAdd && (
        <MachineForm
          userId={userId}
          onSave={async () => { setShowAdd(false); await fetchMachines(); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Machine Cards */}
      {machines.length === 0 && !showAdd && (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <Monitor className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-medium text-slate-300">No machines configured</h3>
          <p className="mt-1 text-sm text-slate-500">Add your first laser machine to start sending jobs directly from Studio</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
            <Plus className="h-4 w-4" /> Add Machine
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {machines.map(m => (
          <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            {editId === m.id ? (
              <MachineForm
                machine={m}
                userId={userId}
                onSave={async () => { setEditId(null); await fetchMachines(); }}
                onCancel={() => setEditId(null)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${
                      m.connectionStatus === 'ONLINE' ? 'bg-emerald-500' :
                      m.connectionStatus === 'BUSY' ? 'bg-amber-500 animate-pulse' :
                      m.connectionStatus === 'ERROR' ? 'bg-red-500' : 'bg-slate-600'
                    }`} />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">{m.name}</h3>
                      <div className="text-[10px] text-slate-500">{m.machineType || 'Unknown'} — {m.connectionType || 'Manual'}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditId(m.id)} className="rounded p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(m.id)} className="rounded p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {m.ipAddress && <div><span className="text-slate-500">IP:</span> <span className="text-slate-300">{m.ipAddress}{m.port ? `:${m.port}` : ''}</span></div>}
                  {m.bedWidthMm && m.bedHeightMm && <div><span className="text-slate-500">Bed:</span> <span className="text-slate-300">{m.bedWidthMm}×{m.bedHeightMm}mm</span></div>}
                  {m.maxPowerW && <div><span className="text-slate-500">Power:</span> <span className="text-slate-300">{m.maxPowerW}W</span></div>}
                  {m.maxSpeedMmS && <div><span className="text-slate-500">Speed:</span> <span className="text-slate-300">{m.maxSpeedMmS}mm/s</span></div>}
                  {m.firmwareVersion && <div><span className="text-slate-500">FW:</span> <span className="text-slate-300">{m.firmwareVersion}</span></div>}
                  {m.hourlyCost && <div><span className="text-slate-500">Cost:</span> <span className="text-slate-300">${m.hourlyCost}/hr</span></div>}
                  {m._count && <div><span className="text-slate-500">Jobs:</span> <span className="text-slate-300">{m._count.laserJobs}</span></div>}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handlePing(m.id)}
                    disabled={pingStatus[m.id] === 'loading'}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    {pingStatus[m.id] === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> :
                     pingStatus[m.id] === 'ok' ? <CheckCircle className="h-3 w-3 text-emerald-400" /> :
                     pingStatus[m.id] === 'fail' ? <AlertTriangle className="h-3 w-3 text-red-400" /> :
                     <Signal className="h-3 w-3" />}
                    Ping
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Machine Form ────────────────────────────────────────────────
function MachineForm({ machine, userId, onSave, onCancel }: {
  machine?: Machine; userId: string | null;
  onSave: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: machine?.name || '',
    machineType: machine?.machineType || 'CO2',
    connectionType: machine?.connectionType || 'MANUAL',
    ipAddress: machine?.ipAddress || '',
    port: machine?.port?.toString() || '',
    bedWidthMm: machine?.bedWidthMm?.toString() || '400',
    bedHeightMm: machine?.bedHeightMm?.toString() || '300',
    maxPowerW: machine?.maxPowerW?.toString() || '60',
    maxSpeedMmS: machine?.maxSpeedMmS?.toString() || '500',
    accelerationMmS2: machine?.accelerationMmS2?.toString() || '8000',
    homePosition: machine?.homePosition || 'top-left',
    hourlyCost: machine?.hourlyCost?.toString() || '30',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const data = {
        name: form.name,
        machineType: form.machineType,
        connectionType: form.connectionType,
        ipAddress: form.ipAddress || null,
        port: form.port ? parseInt(form.port) : null,
        bedWidthMm: parseInt(form.bedWidthMm) || null,
        bedHeightMm: parseInt(form.bedHeightMm) || null,
        maxPowerW: parseInt(form.maxPowerW) || null,
        maxSpeedMmS: parseInt(form.maxSpeedMmS) || null,
        accelerationMmS2: parseInt(form.accelerationMmS2) || null,
        homePosition: form.homePosition,
        hourlyCost: parseFloat(form.hourlyCost) || null,
        userId,
      };
      if (machine) {
        await apiClient.put(`/laser-machines/${machine.id}`, data);
      } else {
        await apiClient.post('/laser-machines', data);
      }
      onSave();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="rounded-xl border border-sky-800/40 bg-sky-900/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-sky-300">{machine ? 'Edit Machine' : 'Add Machine'}</h3>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300"><X className="h-4 w-4" /></button>
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10px] text-slate-500">Name *</label>
          <input value={form.name} onChange={set('name')} className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-600 focus:outline-none" placeholder="My CO2 Laser" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Machine Type</label>
          <select value={form.machineType} onChange={set('machineType')} className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-600 focus:outline-none">
            {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Connection Type</label>
          <select value={form.connectionType} onChange={set('connectionType')} className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-600 focus:outline-none">
            {CONNECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500">IP Address</label>
          <input value={form.ipAddress} onChange={set('ipAddress')} className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-600 focus:outline-none" placeholder="192.168.1.100" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Port</label>
          <input value={form.port} onChange={set('port')} type="number" className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-600 focus:outline-none" placeholder="8080" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Bed Width (mm)</label>
          <input value={form.bedWidthMm} onChange={set('bedWidthMm')} type="number" className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-600 focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Bed Height (mm)</label>
          <input value={form.bedHeightMm} onChange={set('bedHeightMm')} type="number" className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-600 focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Max Power (W)</label>
          <input value={form.maxPowerW} onChange={set('maxPowerW')} type="number" className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-600 focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Max Speed (mm/s)</label>
          <input value={form.maxSpeedMmS} onChange={set('maxSpeedMmS')} type="number" className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-600 focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Hourly Cost ($)</label>
          <input value={form.hourlyCost} onChange={set('hourlyCost')} type="number" step="0.01" className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-600 focus:outline-none" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {machine ? 'Update' : 'Add Machine'}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:bg-slate-800">Cancel</button>
      </div>
    </div>
  );
}
