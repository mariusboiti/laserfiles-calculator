import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'product-label-generator',
  title: 'Tutoriel : Étiquettes Produit & SKU',
  description: 'Créez des étiquettes professionnelles avec codes SKU, codes QR et export.',
  estimatedTime: '4-6 min',
  difficulty: 'beginner',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: "Qu'est-ce que le Générateur d'Étiquettes Produit ?",
      content: `Le Générateur d’Étiquettes Produit crée des étiquettes professionnelles pour la découpe/gravure laser. Fonctionnalités :

• Génération de codes SKU
• Intégration de code QR
• Import CSV (lot)
• Plusieurs mises en page d’étiquettes
• Tailles personnalisées
• Mise en page efficace sur une feuille

Idéal pour l’étiquetage produit, la gestion d’inventaire et le retail.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Guide étape par étape',
      steps: [
        {
          title: "Choisissez la taille de l'étiquette",
          content: 'Sélectionnez des tailles standard ou saisissez des dimensions personnalisées.',
        },
        {
          title: 'Saisissez les infos produit',
          content: 'Ajoutez le nom du produit, le SKU, le prix ou d’autres champs texte.',
        },
        {
          title: 'Ajoutez un code QR (optionnel)',
          content: 'Générez des QR codes vers des URLs, des pages produit ou des données personnalisées.',
        },
        {
          title: 'Importez des données en lot',
          content: 'Importez un CSV pour plusieurs produits. Associez les colonnes aux champs.',
        },
        {
          title: 'Personnalisez la mise en page',
          content: 'Disposez texte, codes et graphismes. Réglez polices et tailles.',
        },
        {
          title: 'Exportez les étiquettes',
          content: 'Téléchargez des SVG individuels ou des mises en page optimisées sur feuille.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Bonnes pratiques',
      tips: [
        'Utilisez des tailles d’étiquette cohérentes pour une même gamme',
        'Gardez les QR codes à au moins 15×15mm pour un scan fiable',
        'Testez le scan du QR avant la production en série',
        'Ajoutez un SKU lisible à côté du QR code',
        'Choisissez des matériaux durables pour des étiquettes manipulées',
        'Pensez à des trous de fixation ou zones adhésives',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Dépannage',
      tips: [
        'QR illisible ? Augmentez la taille ou améliorez le contraste',
        'Texte trop petit ? Réduisez les infos ou augmentez la taille de l’étiquette',
        'CSV ne s’importe pas ? Vérifiez l’encodage (UTF-8) et le format des colonnes',
        'Étiquettes décalées ? Vérifiez la position du matériau et la taille de la feuille',
      ],
    },
  ],
};

export default tutorial;
