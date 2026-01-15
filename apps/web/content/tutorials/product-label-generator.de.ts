import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'product-label-generator',
  title: 'Tutorial: Produktetiketten & SKU',
  description: 'Erstellen Sie professionelle Produktetiketten mit SKU-Codes, QR-Codes und Export.',
  estimatedTime: '4-6 min',
  difficulty: 'beginner',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'Was ist der Produktetiketten-Generator?',
      content: `Der Produktetiketten-Generator erstellt professionelle Etiketten für Laser-Schneiden/Gravieren. Features:

• SKU-Code-Erstellung
• QR-Code-Integration
• CSV-Import (Batch)
• Mehrere Etiketten-Layouts
• Benutzerdefinierte Größen
• Effiziente Bogen-Layouts

Ideal für Produktkennzeichnung, Inventarverwaltung und Retail.`
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Schritt-für-Schritt-Anleitung',
      steps: [
        {
          title: 'Etikettengröße wählen',
          content: 'Wählen Sie Standardgrößen oder geben Sie eigene Maße ein.',
        },
        {
          title: 'Produktinfos eingeben',
          content: 'Fügen Sie Produktname, SKU, Preis oder andere Textfelder hinzu.',
        },
        {
          title: 'QR-Code hinzufügen (optional)',
          content: 'Erstellen Sie QR-Codes zu URLs, Produktseiten oder benutzerdefinierten Daten.',
        },
        {
          title: 'Batch-Daten importieren',
          content: 'CSV für mehrere Produkte hochladen und Spalten den Feldern zuordnen.',
        },
        {
          title: 'Layout anpassen',
          content: 'Text, Codes und Grafiken anordnen. Schriften und Größen einstellen.',
        },
        {
          title: 'Etiketten exportieren',
          content: 'Einzelne SVGs oder optimierte Bogen-Layouts herunterladen.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Verwenden Sie einheitliche Etikettengrößen innerhalb einer Produktlinie',
        'QR-Codes mindestens 15×15mm groß für zuverlässiges Scannen',
        'QR-Scan vor Serienproduktion testen',
        'Lesbare SKU zusätzlich zum QR-Code angeben',
        'Robuste Materialien für Etiketten wählen, die oft angefasst werden',
        'Befestigungslöcher oder Klebeflächen einplanen',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Fehlerbehebung',
      tips: [
        'QR scannt nicht? Größe erhöhen oder Kontrast prüfen',
        'Text zu klein? Weniger Infos oder größere Etiketten',
        'CSV-Import klappt nicht? Encoding (UTF-8) und Spaltenformat prüfen',
        'Etiketten versetzt? Materialpositionierung und Bogengröße prüfen',
      ],
    },
  ],
};

export default tutorial;
