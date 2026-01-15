'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useToolUx } from '@/components/ux/ToolUxProvider';
import { downloadTextFile } from '@/lib/studio/export/download';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { generateLabelSvg } from '../core/generateLabelSvg';

function safeFilenamePart(value: string) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return 'unknown';
  return trimmed.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function ProductLabelTool({
  onGetExportPayload,
}: {
  onGetExportPayload?: (getExportPayload: () => Promise<{ svg: string; name?: string; meta?: any }> | { svg: string; name?: string; meta?: any }) => void;
}) {
  const { api } = useToolUx();
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  useEffect(() => {
    api.setIsEmpty(false);
  }, [api]);

  const defaultProductName = t('product_labels.defaults.product_name');
  const defaultSku = t('product_labels.defaults.sku');

  const prevDefaultsRef = useRef<{ productName: string; sku: string } | null>(null);

  const [productName, setProductName] = useState(() => defaultProductName);
  const [sku, setSku] = useState(() => defaultSku);
  const [price, setPrice] = useState('');
  const [qrText, setQrText] = useState('');

  useEffect(() => {
    const prev = prevDefaultsRef.current;
    if (prev) {
      if (productName === prev.productName) setProductName(defaultProductName);
      if (sku === prev.sku) setSku(defaultSku);
    }
    prevDefaultsRef.current = { productName: defaultProductName, sku: defaultSku };
  }, [defaultProductName, defaultSku, productName, sku]);

  const [widthMm, setWidthMm] = useState<number>(60);
  const [heightMm, setHeightMm] = useState<number>(30);

  const [showBorder, setShowBorder] = useState(true);
  const [rounded, setRounded] = useState(false);
  const [showQr, setShowQr] = useState(true);

  const svg = useMemo(() => {
    try {
      return generateLabelSvg({
        widthMm,
        heightMm,
        productName,
        sku,
        price: price.trim() ? price : undefined,
        showBorder,
        rounded,
        qrText: showQr && qrText.trim() ? qrText : undefined,
      });
    } catch {
      return '';
    }
  }, [
    widthMm,
    heightMm,
    productName,
    sku,
    price,
    showBorder,
    rounded,
    showQr,
    qrText,
  ]);

  const getExportPayload = useCallback(() => {
    return {
      svg,
      name: `product-label-${safeFilenamePart(sku)}`,
      meta: {
        bboxMm: { width: widthMm, height: heightMm },
        sku,
        productName,
      },
    };
  }, [heightMm, productName, sku, svg, widthMm]);

  useEffect(() => {
    onGetExportPayload?.(getExportPayload);
  }, [getExportPayload, onGetExportPayload]);

  function setPreset(w: number, h: number) {
    setWidthMm(w);
    setHeightMm(h);
  }

  function onExport() {
    if (!svg) return;
    const filename = `product-label-${safeFilenamePart(sku)}.svg`;
    downloadTextFile(filename, svg, 'image/svg+xml');
  }

  return (
    <div className="lfs-tool lfs-tool-product-label-generator">
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="grid grid-cols-1 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">{t('product_labels.inputs.product_name')}</div>
                <input
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">{t('product_labels.inputs.sku')}</div>
                <input
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">{t('product_labels.inputs.price_optional')}</div>
                <input
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t('product_labels.inputs.price_placeholder')}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">{t('product_labels.inputs.qr_text_optional')}</div>
                <input
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  placeholder={t('product_labels.inputs.qr_text_placeholder')}
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">{t('product_labels.inputs.width_mm')}</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={widthMm}
                  min={10}
                  onChange={(e) => setWidthMm(Number(e.target.value))}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">{t('product_labels.inputs.height_mm')}</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={heightMm}
                  min={10}
                  onChange={(e) => setHeightMm(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPreset(60, 30)}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              >
                60×30
              </button>
              <button
                type="button"
                onClick={() => setPreset(70, 40)}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              >
                70×40
              </button>
              <button
                type="button"
                onClick={() => setPreset(80, 50)}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              >
                80×50
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={showBorder}
                  onChange={(e) => setShowBorder(e.target.checked)}
                />
                {t('product_labels.options.border')}
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={rounded}
                  onChange={(e) => setRounded(e.target.checked)}
                />
                {t('product_labels.options.rounded_corners')}
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={showQr}
                  onChange={(e) => setShowQr(e.target.checked)}
                />
                {t('product_labels.options.qr_code')}
              </label>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={onExport}
                className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
              >
                {t('product_labels.actions.export_svg')}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-2 text-xs text-slate-300">{t('product_labels.preview.live_title')}</div>
          <div className="overflow-auto rounded-lg border border-slate-800 bg-white p-3 [&_svg]:h-auto [&_svg]:max-w-full">
            {svg ? (
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <div className="text-sm text-slate-500">{t('product_labels.preview.unavailable')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
