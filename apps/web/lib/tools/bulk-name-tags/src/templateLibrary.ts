export interface TemplateLibraryItem {
  id: string;
  name: string;
  description: string;
  svg: string;
}

export const templateLibrary: TemplateLibraryItem[] = [
  {
    id: 'rounded-rect',
    name: 'Rounded Rectangle (80x30)',
    description: 'Simple rounded rectangle name tag',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="30mm" viewBox="0 0 80 30">
  <rect x="1" y="1" width="78" height="28" rx="4" ry="4" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'tag-with-hole',
    name: 'Tag with Hole (90x30)',
    description: 'Rectangle tag with a hanging hole on the left',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="90mm" height="30mm" viewBox="0 0 90 30">
  <rect x="1" y="1" width="88" height="28" rx="4" ry="4" fill="none" stroke="black" stroke-width="0.2" />
  <circle cx="10" cy="15" r="3" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'circle-badge',
    name: 'Circle Badge (35x35)',
    description: 'Round badge, useful for stickers or small ornaments',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="35mm" height="35mm" viewBox="0 0 35 35">
  <circle cx="17.5" cy="17.5" r="16" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'hexagon',
    name: 'Hexagon (60x52)',
    description: 'Hexagon tag shape with flat top',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="52mm" viewBox="0 0 60 52">
  <path d="M15 1 L45 1 L59 26 L45 51 L15 51 L1 26 Z" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'pill',
    name: 'Pill / Capsule (80x25)',
    description: 'Rounded capsule, good for modern name tags',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="25mm" viewBox="0 0 80 25">
  <rect x="1" y="1" width="78" height="23" rx="11.5" ry="11.5" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'rounded-rect-wide',
    name: 'Wide Rounded Rectangle (100x30)',
    description: 'Extra width for longer names',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="30mm" viewBox="0 0 100 30">
  <rect x="1" y="1" width="98" height="28" rx="4" ry="4" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'thin-rect',
    name: 'Thin Rectangle (90x20)',
    description: 'Slim tag for smaller materials',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="90mm" height="20mm" viewBox="0 0 90 20">
  <rect x="1" y="1" width="88" height="18" rx="3" ry="3" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'dog-tag',
    name: 'Dog Tag (70x40)',
    description: 'Classic dog tag style with top-left hole',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="70mm" height="40mm" viewBox="0 0 70 40">
  <rect x="1" y="1" width="68" height="38" rx="10" ry="10" fill="none" stroke="black" stroke-width="0.2" />
  <circle cx="14" cy="12" r="2.7" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'ticket',
    name: 'Ticket (85x30)',
    description: 'Ticket stub shape with side notches',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="85mm" height="30mm" viewBox="0 0 85 30">
  <path d="M4 1 H81 Q84 1 84 4 V10 Q80 10 80 15 Q80 20 84 20 V26 Q84 29 81 29 H4 Q1 29 1 26 V20 Q5 20 5 15 Q5 10 1 10 V4 Q1 1 4 1 Z" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'label-angle',
    name: 'Angled Label (90x30)',
    description: 'Label with an angled right side',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="90mm" height="30mm" viewBox="0 0 90 30">
  <path d="M1 5 Q1 1 5 1 H70 L89 15 L70 29 H5 Q1 29 1 25 Z" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'shield',
    name: 'Shield (50x60)',
    description: 'Shield shape for badges',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="60mm" viewBox="0 0 50 60">
  <path d="M5 2 H45 Q48 2 48 5 V24 C48 42 37 54 25 58 C13 54 2 42 2 24 V5 Q2 2 5 2 Z" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'scalloped-circle',
    name: 'Scalloped Circle (45x45)',
    description: 'Decorative scalloped badge',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="45mm" height="45mm" viewBox="0 0 45 45">
  <path d="M22.5 2.5 C24.5 2.5 26 4.2 27.9 4.7 C29.8 5.2 31.9 4.5 33.5 5.7 C35.1 6.9 35 9.1 36.2 10.7 C37.4 12.3 39.5 13 40 14.9 C40.5 16.8 38.8 18.3 38.8 20.3 C38.8 22.3 40.5 23.8 40 25.7 C39.5 27.6 37.4 28.3 36.2 29.9 C35 31.5 35.1 33.7 33.5 34.9 C31.9 36.1 29.8 35.4 27.9 35.9 C26 36.4 24.5 38.1 22.5 38.1 C20.5 38.1 19 36.4 17.1 35.9 C15.2 35.4 13.1 36.1 11.5 34.9 C9.9 33.7 10 31.5 8.8 29.9 C7.6 28.3 5.5 27.6 5 25.7 C4.5 23.8 6.2 22.3 6.2 20.3 C6.2 18.3 4.5 16.8 5 14.9 C5.5 13 7.6 12.3 8.8 10.7 C10 9.1 9.9 6.9 11.5 5.7 C13.1 4.5 15.2 5.2 17.1 4.7 C19 4.2 20.5 2.5 22.5 2.5 Z" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'circle-with-top-hole',
    name: 'Round Ornament with Hole (50x55)',
    description: 'Ornament circle with a top hanging hole',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="55mm" viewBox="0 0 50 55">
  <circle cx="25" cy="32" r="22" fill="none" stroke="black" stroke-width="0.2" />
  <circle cx="25" cy="8" r="2.5" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'rounded-square',
    name: 'Rounded Square (45x45)',
    description: 'Compact badge shape',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="45mm" height="45mm" viewBox="0 0 45 45">
  <rect x="1" y="1" width="43" height="43" rx="6" ry="6" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'oval',
    name: 'Oval (80x35)',
    description: 'Oval border for elegant name tags',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="35mm" viewBox="0 0 80 35">
  <ellipse cx="40" cy="17.5" rx="38" ry="15.5" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'diamond',
    name: 'Diamond (55x55)',
    description: 'Diamond/rhombus shape',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="55mm" height="55mm" viewBox="0 0 55 55">
  <path d="M27.5 1 L54 27.5 L27.5 54 L1 27.5 Z" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'rect-two-holes',
    name: 'Rectangle with 2 Holes (95x30)',
    description: 'Good for hanging with ties on both sides',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="95mm" height="30mm" viewBox="0 0 95 30">
  <rect x="1" y="1" width="93" height="28" rx="4" ry="4" fill="none" stroke="black" stroke-width="0.2" />
  <circle cx="12" cy="15" r="2.6" fill="none" stroke="black" stroke-width="0.2" />
  <circle cx="83" cy="15" r="2.6" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  },
  {
    id: 'arch-top',
    name: 'Arch Top (60x40)',
    description: 'Rounded arch top with flat bottom',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40">
  <path d="M8 39 H52 V20 C52 10 44 2 30 2 C16 2 8 10 8 20 Z" fill="none" stroke="black" stroke-width="0.2" />
</svg>`
  }
];
