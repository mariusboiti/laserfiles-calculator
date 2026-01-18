'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useT } from '../i18n';

interface StoreConnection {
  id: string;
  name: string;
  channel: 'WOOCOMMERCE' | 'ETSY' | 'CSV';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastSyncAt: string | null;
  createdAt: string;
  settingsJson?: any;
  importHealth?: 'NO_DATA' | 'OK' | 'STALE' | 'ERROR';
  externalOrderStats?: {
    total: number;
    needsReview: number;
    ignored: number;
    error: number;
  };
}

export default function SalesChannelsPage() {
  const t = useT();
  const [connections, setConnections] = useState<StoreConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [wooName, setWooName] = useState('');
  const [wooStoreUrl, setWooStoreUrl] = useState('');
  const [wooApiKey, setWooApiKey] = useState('');
  const [wooApiSecret, setWooApiSecret] = useState('');
   const [wooEnableStatusPush, setWooEnableStatusPush] = useState(false);
   const [wooShippedStatusValue, setWooShippedStatusValue] = useState('');
  const [wooCreating, setWooCreating] = useState(false);
  const [wooMessage, setWooMessage] = useState<string | null>(null);

  const [etsyName, setEtsyName] = useState('');
  const [etsyToken, setEtsyToken] = useState('');
  const [etsyShopId, setEtsyShopId] = useState('');
  const [etsyEnableStatusPush, setEtsyEnableStatusPush] = useState(false);
  const [etsyShippedStatusValue, setEtsyShippedStatusValue] = useState('');
  const [etsyCreating, setEtsyCreating] = useState(false);
  const [etsyMessage, setEtsyMessage] = useState<string | null>(null);

  const [csvName, setCsvName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);

  async function loadConnections() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<StoreConnection[]>('/sales-channels/connections');
      setConnections(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels.failed_to_load_connections');
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConnections();
  }, []);

  async function handleCreateWoo(e: FormEvent) {
    e.preventDefault();
    setWooMessage(null);
    if (!wooName.trim() || !wooStoreUrl.trim()) {
      setWooMessage(t('sales_channels.woo.validation.name_store_url_required'));
      return;
    }
    setWooCreating(true);
    try {
      const body = {
        name: wooName.trim(),
        channel: 'WOOCOMMERCE' as const,
        credentialsJson: {
          storeUrl: wooStoreUrl.trim(),
          apiKey: wooApiKey.trim() || undefined,
          apiSecret: wooApiSecret.trim() || undefined,
        },
        settingsJson: {
          auto_import_enabled: false,
          auto_create_orders: false,
          default_order_priority: 'NORMAL',
          enable_status_push: wooEnableStatusPush,
          shipped_status_value: wooShippedStatusValue.trim() || undefined,
        },
      };
      const res = await apiClient.post<StoreConnection>('/sales-channels/connections', body);
      setConnections((prev) => [res.data, ...prev]);
      setWooMessage(t('sales_channels.woo.saved_message'));
      setWooName('');
      setWooStoreUrl('');
      setWooApiKey('');
      setWooApiSecret('');
      setWooEnableStatusPush(false);
      setWooShippedStatusValue('');
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels.woo.failed_to_create');
      setWooMessage(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setWooCreating(false);
    }
  }

  async function handleCreateEtsy(e: FormEvent) {
    e.preventDefault();
    setEtsyMessage(null);
    if (!etsyName.trim() || !etsyToken.trim()) {
      setEtsyMessage(t('sales_channels.etsy.validation.name_token_required'));
      return;
    }
    setEtsyCreating(true);
    try {
      const body = {
        name: etsyName.trim(),
        channel: 'ETSY' as const,
        credentialsJson: {
          token: etsyToken.trim(),
          shopId: etsyShopId.trim() || undefined,
        },
        settingsJson: {
          auto_import_enabled: false,
          auto_create_orders: false,
          default_order_priority: 'NORMAL',
          enable_status_push: etsyEnableStatusPush,
          shipped_status_value: etsyShippedStatusValue.trim() || undefined,
        },
      };
      const res = await apiClient.post<StoreConnection>('/sales-channels/connections', body);
      setConnections((prev) => [res.data, ...prev]);
      setEtsyMessage(t('sales_channels.etsy.saved_message'));
      setEtsyName('');
      setEtsyToken('');
      setEtsyShopId('');
      setEtsyEnableStatusPush(false);
      setEtsyShippedStatusValue('');
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels.etsy.failed_to_create');
      setEtsyMessage(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setEtsyCreating(false);
    }
  }

  async function handleImportCsv(e: FormEvent) {
    e.preventDefault();
    setCsvMessage(null);
    if (!csvText.trim()) {
      setCsvMessage(t('sales_channels.csv.validation.paste_csv'));
      return;
    }
    setCsvImporting(true);
    try {
      const body = {
        csv: csvText,
        connectionName: csvName.trim() || undefined,
      };
      const res = await apiClient.post<{
        connectionId: string;
        importedOrders: number;
        totalCsvRows: number;
      }>('/sales-channels/csv/import', body);
      setCsvMessage(
        t('sales_channels.csv.imported_message')
          .replace('{0}', String(res.data.importedOrders))
          .replace('{1}', String(res.data.totalCsvRows)),
      );
      setCsvText('');
      setCsvName('');
      await loadConnections();
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels.csv.failed_to_import');
      setCsvMessage(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setCsvImporting(false);
    }
  }

  async function handleTestConnection(id: string) {
    try {
      const res = await apiClient.post(
        `/sales-channels/connections/${id}/test`,
        {},
      );
      await loadConnections();
      alert(res.data.message || t('sales_channels.test_completed'));
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels.test_failed');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  async function handleSyncConnection(id: string) {
    try {
      const res = await apiClient.post(
        `/sales-channels/connections/${id}/sync`,
        {},
      );
      await loadConnections();
      alert(
        res.data.imported
          ? t('sales_channels.sync_imported').replace('{0}', String(res.data.imported))
          : t('sales_channels.sync_completed_no_new'),
      );
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels.sync_failed');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('sales_channels.title')}</h1>
        <p className="mt-1 text-xs text-slate-400">
          {t('sales_channels.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <form
          onSubmit={handleCreateWoo}
          className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-sm font-medium text-slate-100">{t('sales_channels.woo.title')}</div>
          <p className="text-[11px] text-slate-400">
            {t('sales_channels.woo.subtitle')}
          </p>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels.form.name')}</span>
            <input
              type="text"
              value={wooName}
              onChange={(e) => setWooName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels.woo.store_url')}</span>
            <input
              type="text"
              placeholder={t('sales_channels.woo.store_url_placeholder')}
              value={wooStoreUrl}
              onChange={(e) => setWooStoreUrl(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels.woo.api_key_optional')}</span>
            <input
              type="text"
              value={wooApiKey}
              onChange={(e) => setWooApiKey(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels.woo.api_secret_optional')}</span>
            <input
              type="password"
              value={wooApiSecret}
              onChange={(e) => setWooApiSecret(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={wooEnableStatusPush}
              onChange={(e) => setWooEnableStatusPush(e.target.checked)}
              className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500"
            />
            <span>{t('sales_channels.woo.enable_status_push')}</span>
          </label>
          {wooEnableStatusPush && (
            <label className="flex flex-col gap-1">
              <span>{t('sales_channels.woo.shipped_status_value_optional')}</span>
              <input
                type="text"
                placeholder={t('sales_channels.woo.shipped_status_value_placeholder')}
                value={wooShippedStatusValue}
                onChange={(e) => setWooShippedStatusValue(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
          )}
          {wooMessage && <p className="text-[11px] text-slate-300">{wooMessage}</p>}
          <button
            type="submit"
            disabled={wooCreating}
            className="mt-1 rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {wooCreating ? t('common.saving') : t('sales_channels.woo.connect')}
          </button>
        </form>

        <form
          onSubmit={handleCreateEtsy}
          className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-sm font-medium text-slate-100">{t('sales_channels.etsy.title')}</div>
          <p className="text-[11px] text-slate-400">
            {t('sales_channels.etsy.subtitle')}
          </p>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels.form.name')}</span>
            <input
              type="text"
              value={etsyName}
              onChange={(e) => setEtsyName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels.etsy.access_token')}</span>
            <input
              type="password"
              value={etsyToken}
              onChange={(e) => setEtsyToken(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels.etsy.shop_id_optional')}</span>
            <input
              type="text"
              value={etsyShopId}
              onChange={(e) => setEtsyShopId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={etsyEnableStatusPush}
              onChange={(e) => setEtsyEnableStatusPush(e.target.checked)}
              className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500"
            />
            <span>{t('sales_channels.etsy.enable_status_push')}</span>
          </label>
          {etsyEnableStatusPush && (
            <label className="flex flex-col gap-1">
              <span>{t('sales_channels.etsy.shipped_status_value_optional')}</span>
              <input
                type="text"
                placeholder={t('sales_channels.etsy.shipped_status_value_placeholder')}
                value={etsyShippedStatusValue}
                onChange={(e) => setEtsyShippedStatusValue(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
          )}
          {etsyMessage && <p className="text-[11px] text-slate-300">{etsyMessage}</p>}
          <button
            type="submit"
            disabled={etsyCreating}
            className="mt-1 rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {etsyCreating ? t('common.saving') : t('sales_channels.etsy.connect')}
          </button>
        </form>

        <form
          onSubmit={handleImportCsv}
          className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-sm font-medium text-slate-100">{t('sales_channels.csv.title')}</div>
          <p className="text-[11px] text-slate-400">
            {t('sales_channels.csv.subtitle')}
          </p>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels.csv.connection_name_optional')}</span>
            <input
              type="text"
              value={csvName}
              onChange={(e) => setCsvName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels.csv.content')}</span>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder={t('sales_channels.csv.placeholder')}
            />
          </label>
          {csvMessage && <p className="text-[11px] text-slate-300">{csvMessage}</p>}
          <button
            type="submit"
            disabled={csvImporting}
            className="mt-1 rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {csvImporting ? t('sales_channels.csv.importing') : t('sales_channels.csv.import')}
          </button>
        </form>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t('sales_channels.connections.title')}
          </div>
          {loading && <div className="text-[11px] text-slate-400">{t('common.loading')}</div>}
        </div>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
        {!loading && !error && connections.length === 0 && (
          <p className="text-[11px] text-slate-400">{t('sales_channels.connections.none_found')}</p>
        )}
        {!loading && !error && connections.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
            <table className="min-w-full text-left text-xs text-slate-200">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">{t('sales_channels.connections.table.name')}</th>
                  <th className="px-3 py-2">{t('sales_channels.connections.table.channel')}</th>
                  <th className="px-3 py-2">{t('sales_channels.connections.table.status')}</th>
                  <th className="px-3 py-2">{t('sales_channels.connections.table.import_health')}</th>
                  <th className="px-3 py-2">{t('sales_channels.connections.table.last_sync')}</th>
                  <th className="px-3 py-2">{t('sales_channels.connections.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="px-3 py-2 align-top text-xs font-medium text-slate-100">
                      {c.name}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-slate-300">
                      {t(`sales_channels.channel.${c.channel.toLowerCase()}` as any)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                          c.status === 'CONNECTED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : c.status === 'ERROR'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {t(`sales_channels.connection_status.${c.status.toLowerCase()}` as any)}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                      <div className="mb-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                            c.importHealth === 'OK'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : c.importHealth === 'ERROR'
                              ? 'bg-red-500/20 text-red-300'
                              : c.importHealth === 'STALE'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {c.importHealth === 'OK'
                            ? t('sales_channels.import_health.ok')
                            : c.importHealth === 'STALE'
                            ? t('sales_channels.import_health.stale')
                            : c.importHealth === 'ERROR'
                            ? t('sales_channels.import_health.issues')
                            : t('sales_channels.import_health.no_data')}
                        </span>
                      </div>
                      {c.externalOrderStats && (
                        <div className="space-y-0.5 text-[11px] text-slate-400">
                          <div>
                            {t('sales_channels.stats.imported').replace('{0}', String(c.externalOrderStats.total))}
                          </div>
                          <div>
                            {t('sales_channels.stats.needs_review').replace('{0}', String(c.externalOrderStats.needsReview))}
                          </div>
                          {c.externalOrderStats.ignored > 0 && (
                            <div>
                              {t('sales_channels.stats.ignored').replace('{0}', String(c.externalOrderStats.ignored))}
                            </div>
                          )}
                          {c.externalOrderStats.error > 0 && (
                            <div className="text-red-300">
                              {t('sales_channels.stats.error').replace('{0}', String(c.externalOrderStats.error))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-400">
                      {c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : t('sales_channels.never')}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                      <button
                        type="button"
                        onClick={() => handleTestConnection(c.id)}
                        className="mr-2 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] hover:bg-slate-800"
                      >
                        {t('sales_channels.actions.test')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSyncConnection(c.id)}
                        className="rounded-md border border-sky-600 px-2 py-0.5 text-[11px] text-sky-300 hover:bg-sky-900/40"
                      >
                        {t('sales_channels.actions.sync_now')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
