'use client';

import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { MultiLayerWizard } from '../../../../components/multilayer/MultiLayerWizard';

export default function MultiLayerMakerPage() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <ToolShell
      slug="multilayer-maker"
      title={t('tools.multilayer_maker.title')}
      description={t('tools.multilayer_maker.subtitle')}
      showBack={true}
    >
      <div className="h-[calc(100vh-200px)]">
        <MultiLayerWizard />
      </div>
    </ToolShell>
  );
}
