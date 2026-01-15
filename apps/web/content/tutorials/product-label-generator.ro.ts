import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'product-label-generator',
  title: 'Tutorial: Etichete Produse & SKU',
  description: 'Creează etichete de produs profesionale cu coduri SKU, coduri QR și export.',
  estimatedTime: '4-6 min',
  difficulty: 'beginner',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'Ce este Generatorul de Etichete Produse?',
      content: `Generatorul de Etichete Produse creează etichete profesionale pentru tăiere/gravare laser. Funcționalități:

• Generare coduri SKU
• Integrare cod QR
• Import CSV (batch)
• Layout-uri multiple pentru etichete
• Dimensiuni personalizate
• Layout-uri eficiente pe coală

Perfect pentru etichetare produse, management inventar și etichete pentru retail.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Ghid pas cu pas',
      steps: [
        {
          title: 'Alege dimensiunea etichetei',
          content: 'Selectează dimensiuni standard sau introdu dimensiuni personalizate.',
        },
        {
          title: 'Completează informațiile produsului',
          content: 'Adaugă numele produsului, SKU, preț sau alte câmpuri text.',
        },
        {
          title: 'Adaugă cod QR (opțional)',
          content: 'Generează coduri QR care trimit către URL-uri, pagini de produs sau date personalizate.',
        },
        {
          title: 'Importă date în batch',
          content: 'Încarcă un CSV pentru mai multe produse. Mapează coloanele către câmpurile etichetei.',
        },
        {
          title: 'Personalizează layout-ul',
          content: 'Aranjează textul, codurile și grafica. Setează fonturi și dimensiuni.',
        },
        {
          title: 'Exportă etichetele',
          content: 'Descarcă SVG-uri individuale sau layout-uri optimizate pe coală.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Bune practici',
      tips: [
        'Folosește dimensiuni consistente de etichete pentru produse similare',
        'Păstrează codurile QR la cel puțin 15×15mm pentru scanare fiabilă',
        'Testează scanarea codului QR înainte de producția în serie',
        'Include un SKU lizibil și pentru oameni, lângă codul QR',
        'Folosește materiale durabile pentru etichete care vor fi manipulate',
        'Ia în calcul găuri de prindere sau zone pentru adeziv',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Depanare',
      tips: [
        'QR nu se scanează? Mărește dimensiunea sau verifică contrastul',
        'Text prea mic? Redu informațiile sau mărește eticheta',
        'CSV nu se importă? Verifică encoding-ul (UTF-8) și formatul coloanelor',
        'Etichetele sunt decalate? Verifică poziționarea materialului și dimensiunea foii',
      ],
    },
  ],
};

export default tutorial;
