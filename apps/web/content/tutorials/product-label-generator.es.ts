import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'product-label-generator',
  title: 'Tutorial: Etiquetas de Producto y SKU',
  description: 'Crea etiquetas profesionales con códigos SKU, códigos QR y exportación.',
  estimatedTime: '4-6 min',
  difficulty: 'beginner',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: '¿Qué es el Generador de Etiquetas de Producto?',
      content: `El Generador de Etiquetas de Producto crea etiquetas profesionales para corte/grabado láser. Funciones:

• Generación de códigos SKU
• Integración de código QR
• Importación CSV (lotes)
• Varios diseños de etiquetas
• Tamaños personalizados
• Diseños eficientes en una hoja

Ideal para etiquetado de productos, gestión de inventario y retail.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Guía paso a paso',
      steps: [
        {
          title: 'Elige el tamaño de la etiqueta',
          content: 'Selecciona tamaños estándar o introduce dimensiones personalizadas.',
        },
        {
          title: 'Introduce la información del producto',
          content: 'Añade nombre del producto, SKU, precio u otros campos de texto.',
        },
        {
          title: 'Añade código QR (opcional)',
          content: 'Genera códigos QR que enlacen a URLs, páginas de producto o datos personalizados.',
        },
        {
          title: 'Importa datos en lote',
          content: 'Sube un CSV para múltiples productos. Asigna columnas a los campos de la etiqueta.',
        },
        {
          title: 'Personaliza el diseño',
          content: 'Organiza texto, códigos y gráficos. Ajusta fuentes y tamaños.',
        },
        {
          title: 'Exporta las etiquetas',
          content: 'Descarga SVGs individuales o diseños optimizados en una hoja.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Mejores prácticas',
      tips: [
        'Usa tamaños de etiqueta consistentes en toda la línea de productos',
        'Mantén los códigos QR al menos 15×15mm para un escaneo fiable',
        'Prueba el escaneo del QR antes de la producción por lotes',
        'Incluye un SKU legible junto al código QR',
        'Usa materiales duraderos para etiquetas que se manipulan a menudo',
        'Considera agujeros de montaje o áreas adhesivas',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Solución de problemas',
      tips: [
        '¿El QR no escanea? Aumenta el tamaño o revisa el contraste',
        '¿Texto demasiado pequeño? Reduce información o aumenta el tamaño de la etiqueta',
        '¿CSV no importa? Verifica codificación (UTF-8) y formato de columnas',
        '¿Etiquetas desalineadas? Verifica posicionamiento del material y tamaño de hoja',
      ],
    },
  ],
};

export default tutorial;
