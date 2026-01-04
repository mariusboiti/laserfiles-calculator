/**
 * Keychain Hub V2 - Icon Pack (80+ icons)
 * Organized by categories with SVG paths
 */

import type { IconDef } from '../types';

// Gaming (10 icons)
const GAMING_ICONS: IconDef[] = [
  { id: 'gamepad', name: 'Gamepad', category: 'gaming', viewBox: '0 0 100 100', paths: ['M20 35 Q10 35 10 50 Q10 65 20 65 L35 65 L35 75 L45 75 L45 65 L55 65 L55 75 L65 75 L65 65 L80 65 Q90 65 90 50 Q90 35 80 35 Z M25 45 L25 55 L35 55 L35 45 Z M65 45 L75 45 L75 55 L65 55 Z'] },
  { id: 'controller', name: 'Controller', category: 'gaming', viewBox: '0 0 100 100', paths: ['M15 40 Q5 40 5 55 Q5 70 15 70 L40 70 Q45 70 50 65 Q55 70 60 70 L85 70 Q95 70 95 55 Q95 40 85 40 L60 40 Q55 40 50 45 Q45 40 40 40 Z M25 48 L25 58 M20 53 L30 53 M70 48 A3 3 0 1 1 70 54 A3 3 0 1 1 70 48'] },
  { id: 'joystick', name: 'Joystick', category: 'gaming', viewBox: '0 0 100 100', paths: ['M40 80 L60 80 L65 90 L35 90 Z M45 30 L55 30 L55 80 L45 80 Z M50 10 A15 15 0 1 1 50 40 A15 15 0 1 1 50 10'] },
  { id: 'dice', name: 'Dice', category: 'gaming', viewBox: '0 0 100 100', paths: ['M15 20 L85 20 L85 80 L15 80 Z M35 35 A5 5 0 1 1 35 45 A5 5 0 1 1 35 35 M65 35 A5 5 0 1 1 65 45 A5 5 0 1 1 65 35 M50 50 A5 5 0 1 1 50 60 A5 5 0 1 1 50 50 M35 65 A5 5 0 1 1 35 75 A5 5 0 1 1 35 65 M65 65 A5 5 0 1 1 65 75 A5 5 0 1 1 65 65'] },
  { id: 'puzzle', name: 'Puzzle', category: 'gaming', viewBox: '0 0 100 100', paths: ['M20 20 L45 20 Q45 10 55 10 Q65 10 65 20 L80 20 L80 45 Q90 45 90 55 Q90 65 80 65 L80 80 L55 80 Q55 90 45 90 Q35 90 35 80 L20 80 L20 55 Q10 55 10 45 Q10 35 20 35 Z'] },
  { id: 'chess', name: 'Chess', category: 'gaming', viewBox: '0 0 100 100', paths: ['M30 90 L70 90 L70 80 L30 80 Z M35 80 L35 70 Q35 50 50 40 Q65 50 65 70 L65 80 Z M45 40 L45 25 L40 25 L50 10 L60 25 L55 25 L55 40'] },
  { id: 'cards', name: 'Cards', category: 'gaming', viewBox: '0 0 100 100', paths: ['M25 15 L65 15 Q70 15 70 20 L70 75 Q70 80 65 80 L25 80 Q20 80 20 75 L20 20 Q20 15 25 15 Z M35 20 L75 20 Q80 20 80 25 L80 80 Q80 85 75 85 L35 85 Q30 85 30 80 L30 25 Q30 20 35 20'] },
  { id: 'trophy', name: 'Trophy', category: 'gaming', viewBox: '0 0 100 100', paths: ['M30 10 L70 10 L70 40 Q70 60 50 70 Q30 60 30 40 Z M20 15 L30 15 L30 35 Q20 35 20 25 Z M70 15 L80 15 L80 25 Q80 35 70 35 Z M45 70 L55 70 L55 80 L45 80 Z M35 80 L65 80 L65 90 L35 90 Z'] },
  { id: 'target', name: 'Target', category: 'gaming', viewBox: '0 0 100 100', paths: ['M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10 M50 25 A25 25 0 1 1 50 75 A25 25 0 1 1 50 25 M50 40 A10 10 0 1 1 50 60 A10 10 0 1 1 50 40'] },
  { id: 'sword', name: 'Sword', category: 'gaming', viewBox: '0 0 100 100', paths: ['M50 5 L55 50 L60 50 L50 65 L40 50 L45 50 Z M45 65 L35 75 L25 65 L35 75 L30 90 L40 80 L50 90 L60 80 L70 90 L65 75 L75 65 L65 75 L55 65 Z'] },
];

// Animals (10 icons)
const ANIMALS_ICONS: IconDef[] = [
  { id: 'paw', name: 'Paw', category: 'animals', viewBox: '0 0 100 100', paths: ['M50 55 Q30 55 25 70 Q20 85 35 90 Q50 95 65 90 Q80 85 75 70 Q70 55 50 55 Z M30 35 A8 8 0 1 1 30 51 A8 8 0 1 1 30 35 M70 35 A8 8 0 1 1 70 51 A8 8 0 1 1 70 35 M20 50 A6 6 0 1 1 20 62 A6 6 0 1 1 20 50 M80 50 A6 6 0 1 1 80 62 A6 6 0 1 1 80 50'] },
  { id: 'cat', name: 'Cat', category: 'animals', viewBox: '0 0 100 100', paths: ['M20 20 L20 50 Q20 80 50 80 Q80 80 80 50 L80 20 L60 40 L40 40 Z M35 55 A5 5 0 1 1 35 65 A5 5 0 1 1 35 55 M65 55 A5 5 0 1 1 65 65 A5 5 0 1 1 65 55 M45 70 L50 75 L55 70'] },
  { id: 'dog', name: 'Dog', category: 'animals', viewBox: '0 0 100 100', paths: ['M25 30 Q15 30 15 45 L15 70 Q15 85 30 85 L70 85 Q85 85 85 70 L85 45 Q85 30 75 30 L65 30 L60 20 L40 20 L35 30 Z M35 50 A5 5 0 1 1 35 60 A5 5 0 1 1 35 50 M65 50 A5 5 0 1 1 65 60 A5 5 0 1 1 65 50 M45 70 L50 75 L55 70'] },
  { id: 'butterfly', name: 'Butterfly', category: 'animals', viewBox: '0 0 100 100', paths: ['M50 20 L50 80 M50 30 Q20 10 15 40 Q10 70 40 60 Q50 55 50 50 Q50 55 60 60 Q90 70 85 40 Q80 10 50 30'] },
  { id: 'fish', name: 'Fish', category: 'animals', viewBox: '0 0 100 100', paths: ['M75 50 Q90 35 90 50 Q90 65 75 50 M15 50 Q30 20 60 20 Q85 20 85 50 Q85 80 60 80 Q30 80 15 50 Z M70 45 A4 4 0 1 1 70 53 A4 4 0 1 1 70 45'] },
  { id: 'bird', name: 'Bird', category: 'animals', viewBox: '0 0 100 100', paths: ['M20 50 Q10 40 20 30 Q30 25 40 30 L70 30 Q85 30 85 45 Q85 60 70 60 L50 60 L40 75 L35 60 L30 60 Q15 60 20 50 Z M75 40 A3 3 0 1 1 75 46 A3 3 0 1 1 75 40'] },
  { id: 'rabbit', name: 'Rabbit', category: 'animals', viewBox: '0 0 100 100', paths: ['M35 45 Q25 45 25 60 Q25 80 50 85 Q75 80 75 60 Q75 45 65 45 Q65 15 55 10 Q50 25 50 45 Q50 25 45 10 Q35 15 35 45 Z M40 60 A4 4 0 1 1 40 68 A4 4 0 1 1 40 60 M60 60 A4 4 0 1 1 60 68 A4 4 0 1 1 60 60'] },
  { id: 'bear', name: 'Bear', category: 'animals', viewBox: '0 0 100 100', paths: ['M25 30 A10 10 0 1 1 25 50 L25 30 M75 30 A10 10 0 1 1 75 50 L75 30 M50 25 Q20 25 20 55 Q20 85 50 85 Q80 85 80 55 Q80 25 50 25 Z M35 50 A5 5 0 1 1 35 60 A5 5 0 1 1 35 50 M65 50 A5 5 0 1 1 65 60 A5 5 0 1 1 65 50 M45 70 Q50 75 55 70'] },
  { id: 'unicorn', name: 'Unicorn', category: 'animals', viewBox: '0 0 100 100', paths: ['M50 5 L55 30 L45 30 Z M30 35 Q20 35 20 50 Q20 70 35 75 L35 90 L45 90 L45 75 L55 75 L55 90 L65 90 L65 75 Q80 70 80 50 Q80 35 70 35 Z M35 50 A4 4 0 1 1 35 58 A4 4 0 1 1 35 50'] },
  { id: 'elephant', name: 'Elephant', category: 'animals', viewBox: '0 0 100 100', paths: ['M25 40 Q15 40 15 55 L15 75 L25 75 L25 55 L35 55 L35 85 L45 85 L45 55 L55 55 L55 85 L65 85 L65 55 L75 55 Q85 55 85 40 Q85 25 70 25 L30 25 Q25 25 25 40 Z M30 40 A4 4 0 1 1 30 48 A4 4 0 1 1 30 40'] },
];

// Hearts & Love (10 icons)
const HEARTS_ICONS: IconDef[] = [
  { id: 'heart', name: 'Heart', category: 'hearts', viewBox: '0 0 100 100', paths: ['M50 85 Q20 60 15 45 Q10 25 30 20 Q45 18 50 35 Q55 18 70 20 Q90 25 85 45 Q80 60 50 85 Z'] },
  { id: 'heart-outline', name: 'Heart Outline', category: 'hearts', viewBox: '0 0 100 100', paths: ['M50 80 Q25 60 20 45 Q15 30 30 25 Q42 23 50 35 Q58 23 70 25 Q85 30 80 45 Q75 60 50 80 Z'] },
  { id: 'double-heart', name: 'Double Heart', category: 'hearts', viewBox: '0 0 100 100', paths: ['M35 75 Q15 55 12 45 Q8 30 22 26 Q32 24 35 36 Q38 24 48 26 Q62 30 58 45 Q55 55 35 75 Z M65 75 Q45 55 42 45 Q38 30 52 26 Q62 24 65 36 Q68 24 78 26 Q92 30 88 45 Q85 55 65 75 Z'] },
  { id: 'heart-wings', name: 'Heart Wings', category: 'hearts', viewBox: '0 0 100 100', paths: ['M50 75 Q30 55 27 45 Q23 32 35 28 Q44 26 50 38 Q56 26 65 28 Q77 32 73 45 Q70 55 50 75 Z M25 45 Q5 35 5 50 Q5 65 25 55 M75 45 Q95 35 95 50 Q95 65 75 55'] },
  { id: 'heart-arrow', name: 'Heart Arrow', category: 'hearts', viewBox: '0 0 100 100', paths: ['M50 80 Q25 60 20 45 Q15 30 30 25 Q42 23 50 35 Q58 23 70 25 Q85 30 80 45 Q75 60 50 80 Z M10 20 L90 70 M80 65 L90 70 L85 60'] },
  { id: 'heart-lock', name: 'Heart Lock', category: 'hearts', viewBox: '0 0 100 100', paths: ['M50 85 Q20 60 15 45 Q10 25 30 20 Q45 18 50 35 Q55 18 70 20 Q90 25 85 45 Q80 60 50 85 Z M42 45 L42 40 Q42 32 50 32 Q58 32 58 40 L58 45 M38 45 L62 45 L62 62 L38 62 Z'] },
  { id: 'heart-key', name: 'Heart Key', category: 'hearts', viewBox: '0 0 100 100', paths: ['M30 35 Q15 35 15 50 Q15 65 30 65 Q45 65 45 50 Q45 35 30 35 Z M45 50 L85 50 L85 60 L75 60 L75 55 L65 55 L65 60 L55 60 L55 50'] },
  { id: 'heartbeat', name: 'Heartbeat', category: 'hearts', viewBox: '0 0 100 100', paths: ['M10 50 L30 50 L40 30 L50 70 L60 40 L70 50 L90 50'] },
  { id: 'heart-plus', name: 'Heart Plus', category: 'hearts', viewBox: '0 0 100 100', paths: ['M50 80 Q25 60 20 45 Q15 30 30 25 Q42 23 50 35 Q58 23 70 25 Q85 30 80 45 Q75 60 50 80 Z M45 45 L55 45 M50 40 L50 55'] },
  { id: 'infinity-heart', name: 'Infinity Heart', category: 'hearts', viewBox: '0 0 100 100', paths: ['M25 50 Q10 35 25 35 Q40 35 50 50 Q60 35 75 35 Q90 35 75 50 Q60 65 50 50 Q40 65 25 65 Q10 65 25 50'] },
];

// Hobbies (10 icons)
const HOBBIES_ICONS: IconDef[] = [
  { id: 'music', name: 'Music Note', category: 'hobbies', viewBox: '0 0 100 100', paths: ['M70 15 L70 65 Q70 80 55 80 Q40 80 40 65 Q40 50 55 50 Q60 50 65 55 L65 25 L35 35 L35 75 Q35 90 20 90 Q5 90 5 75 Q5 60 20 60 Q25 60 30 65 L30 20 Z'] },
  { id: 'camera', name: 'Camera', category: 'hobbies', viewBox: '0 0 100 100', paths: ['M15 30 L35 30 L40 20 L60 20 L65 30 L85 30 Q90 30 90 35 L90 75 Q90 80 85 80 L15 80 Q10 80 10 75 L10 35 Q10 30 15 30 Z M50 40 A18 18 0 1 1 50 76 A18 18 0 1 1 50 40'] },
  { id: 'paint', name: 'Paint Palette', category: 'hobbies', viewBox: '0 0 100 100', paths: ['M50 10 Q85 10 90 50 Q95 90 50 90 Q10 90 10 50 Q10 10 50 10 Z M30 40 A6 6 0 1 1 30 52 A6 6 0 1 1 30 40 M50 30 A5 5 0 1 1 50 40 A5 5 0 1 1 50 30 M70 40 A5 5 0 1 1 70 50 A5 5 0 1 1 70 40 M65 60 A4 4 0 1 1 65 68 A4 4 0 1 1 65 60 M40 65 A8 8 0 1 1 40 81 A8 8 0 1 1 40 65'] },
  { id: 'book', name: 'Book', category: 'hobbies', viewBox: '0 0 100 100', paths: ['M15 15 L50 15 L50 85 L15 85 Q10 85 10 80 L10 20 Q10 15 15 15 Z M50 15 L85 15 Q90 15 90 20 L90 80 Q90 85 85 85 L50 85 Z M50 15 L50 85'] },
  { id: 'cooking', name: 'Cooking', category: 'hobbies', viewBox: '0 0 100 100', paths: ['M30 20 L70 20 L70 30 L30 30 Z M35 30 L35 70 Q35 80 50 80 Q65 80 65 70 L65 30 M25 40 L30 40 M70 40 L75 40 M25 55 L30 55 M70 55 L75 55'] },
  { id: 'guitar', name: 'Guitar', category: 'hobbies', viewBox: '0 0 100 100', paths: ['M70 10 L90 10 L90 15 L75 30 L65 20 Z M65 20 L75 30 L55 50 L45 40 Z M45 40 L55 50 Q65 70 50 85 Q35 95 20 80 Q10 65 30 55 L45 40 Z M40 65 A8 8 0 1 1 40 81 A8 8 0 1 1 40 65'] },
  { id: 'film', name: 'Film', category: 'hobbies', viewBox: '0 0 100 100', paths: ['M15 20 L85 20 L85 80 L15 80 Z M15 20 L15 80 M25 20 L25 80 M75 20 L75 80 M85 20 L85 80 M15 30 L25 30 M75 30 L85 30 M15 45 L25 45 M75 45 L85 45 M15 60 L25 60 M75 60 L85 60 M15 70 L25 70 M75 70 L85 70'] },
  { id: 'craft', name: 'Craft', category: 'hobbies', viewBox: '0 0 100 100', paths: ['M20 80 L35 20 L50 80 Z M50 80 L65 20 L80 80 Z M25 60 L45 60 M55 60 L75 60'] },
  { id: 'yoga', name: 'Yoga', category: 'hobbies', viewBox: '0 0 100 100', paths: ['M50 20 A8 8 0 1 1 50 36 A8 8 0 1 1 50 20 M50 36 L50 55 M30 45 L50 45 L70 45 M50 55 L30 80 M50 55 L70 80'] },
  { id: 'garden', name: 'Garden', category: 'hobbies', viewBox: '0 0 100 100', paths: ['M50 50 L50 90 M40 55 Q30 40 40 30 Q50 20 50 40 M60 55 Q70 40 60 30 Q50 20 50 40 M35 70 Q25 60 35 50 Q45 45 45 60 M65 70 Q75 60 65 50 Q55 45 55 60'] },
];

// Sports (10 icons)
const SPORTS_ICONS: IconDef[] = [
  { id: 'football', name: 'Football', category: 'sports', viewBox: '0 0 100 100', paths: ['M50 15 Q80 15 90 50 Q80 85 50 85 Q20 85 10 50 Q20 15 50 15 Z M30 50 L70 50 M50 25 L50 75 M35 30 L65 70 M35 70 L65 30'] },
  { id: 'basketball', name: 'Basketball', category: 'sports', viewBox: '0 0 100 100', paths: ['M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10 M10 50 L90 50 M50 10 L50 90 M20 20 Q50 40 80 20 M20 80 Q50 60 80 80'] },
  { id: 'soccer', name: 'Soccer', category: 'sports', viewBox: '0 0 100 100', paths: ['M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10 M50 30 L35 45 L40 65 L60 65 L65 45 Z'] },
  { id: 'tennis', name: 'Tennis', category: 'sports', viewBox: '0 0 100 100', paths: ['M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10 M20 50 Q50 35 80 50 Q50 65 20 50'] },
  { id: 'baseball', name: 'Baseball', category: 'sports', viewBox: '0 0 100 100', paths: ['M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10 M25 25 Q35 50 25 75 M75 25 Q65 50 75 75'] },
  { id: 'golf', name: 'Golf', category: 'sports', viewBox: '0 0 100 100', paths: ['M50 90 L50 30 L80 15 L50 30 M50 85 Q60 85 60 90 L40 90 Q40 85 50 85 M45 25 A5 5 0 1 1 45 15 A5 5 0 1 1 45 25'] },
  { id: 'swimming', name: 'Swimming', category: 'sports', viewBox: '0 0 100 100', paths: ['M15 60 Q25 50 35 60 Q45 70 55 60 Q65 50 75 60 Q85 70 95 60 M25 40 A8 8 0 1 1 25 56 A8 8 0 1 1 25 40 M33 48 L60 35 M33 52 L50 65'] },
  { id: 'cycling', name: 'Cycling', category: 'sports', viewBox: '0 0 100 100', paths: ['M25 60 A15 15 0 1 1 25 90 A15 15 0 1 1 25 60 M75 60 A15 15 0 1 1 75 90 A15 15 0 1 1 75 60 M25 75 L50 50 L75 75 M50 50 L50 35 M45 35 A5 5 0 1 1 55 35 A5 5 0 1 1 45 35 M40 50 L55 50 L65 60'] },
  { id: 'skiing', name: 'Skiing', category: 'sports', viewBox: '0 0 100 100', paths: ['M45 20 A8 8 0 1 1 55 20 A8 8 0 1 1 45 20 M50 28 L45 50 L35 80 M50 28 L55 50 L65 80 M20 75 L50 85 M80 75 L50 85 M30 40 L25 55 M70 40 L75 55'] },
  { id: 'boxing', name: 'Boxing', category: 'sports', viewBox: '0 0 100 100', paths: ['M25 30 Q15 30 15 45 L15 65 Q15 75 25 75 L40 75 Q50 75 50 65 L50 45 Q50 30 40 30 Z M60 30 Q50 30 50 45 L50 65 Q50 75 60 75 L75 75 Q85 75 85 65 L85 45 Q85 30 75 30 Z'] },
];

// Baby & Kids (8 icons)
const BABY_ICONS: IconDef[] = [
  { id: 'baby', name: 'Baby', category: 'baby', viewBox: '0 0 100 100', paths: ['M50 15 A15 15 0 1 1 50 45 A15 15 0 1 1 50 15 M35 45 Q25 55 25 70 L25 85 L40 85 L40 70 L60 70 L60 85 L75 85 L75 70 Q75 55 65 45 M40 28 A3 3 0 1 1 40 34 A3 3 0 1 1 40 28 M60 28 A3 3 0 1 1 60 34 A3 3 0 1 1 60 28'] },
  { id: 'stroller', name: 'Stroller', category: 'baby', viewBox: '0 0 100 100', paths: ['M30 25 L70 25 L75 60 L25 60 Z M25 60 L20 70 L80 70 L75 60 M30 80 A10 10 0 1 1 50 80 A10 10 0 1 1 30 80 M60 80 A10 10 0 1 1 80 80 A10 10 0 1 1 60 80'] },
  { id: 'bottle', name: 'Baby Bottle', category: 'baby', viewBox: '0 0 100 100', paths: ['M40 10 L60 10 L60 20 L65 25 L65 80 Q65 90 50 90 Q35 90 35 80 L35 25 L40 20 Z M40 35 L60 35'] },
  { id: 'pacifier', name: 'Pacifier', category: 'baby', viewBox: '0 0 100 100', paths: ['M50 30 A20 20 0 1 1 50 70 A20 20 0 1 1 50 30 M50 40 A10 10 0 1 1 50 60 A10 10 0 1 1 50 40 M30 50 L15 50 Q10 50 10 55 L10 65 Q10 70 15 70 L30 70'] },
  { id: 'rattle', name: 'Rattle', category: 'baby', viewBox: '0 0 100 100', paths: ['M50 25 A15 15 0 1 1 50 55 A15 15 0 1 1 50 25 M45 55 L45 85 L55 85 L55 55 M40 85 L60 85 L60 90 L40 90 Z'] },
  { id: 'teddy', name: 'Teddy Bear', category: 'baby', viewBox: '0 0 100 100', paths: ['M25 30 A10 10 0 1 1 25 50 M75 30 A10 10 0 1 1 75 50 M50 25 Q25 25 25 50 Q25 80 50 85 Q75 80 75 50 Q75 25 50 25 Z M40 45 A4 4 0 1 1 40 53 A4 4 0 1 1 40 45 M60 45 A4 4 0 1 1 60 53 A4 4 0 1 1 60 45 M45 60 Q50 65 55 60'] },
  { id: 'blocks', name: 'Building Blocks', category: 'baby', viewBox: '0 0 100 100', paths: ['M15 50 L45 50 L45 80 L15 80 Z M55 50 L85 50 L85 80 L55 80 Z M35 20 L65 20 L65 50 L35 50 Z'] },
  { id: 'balloon', name: 'Balloon', category: 'baby', viewBox: '0 0 100 100', paths: ['M50 15 Q75 15 75 45 Q75 70 50 75 Q25 70 25 45 Q25 15 50 15 Z M50 75 L50 80 Q45 85 50 90 Q55 85 50 80'] },
];

// Transport (8 icons)
const TRANSPORT_ICONS: IconDef[] = [
  { id: 'car', name: 'Car', category: 'transport', viewBox: '0 0 100 100', paths: ['M20 45 L25 30 L75 30 L80 45 L90 50 L90 65 L10 65 L10 50 Z M25 70 A8 8 0 1 1 41 70 A8 8 0 1 1 25 70 M59 70 A8 8 0 1 1 75 70 A8 8 0 1 1 59 70 M30 40 L40 40 L40 50 L25 50 Z M60 40 L70 40 L75 50 L60 50 Z'] },
  { id: 'plane', name: 'Airplane', category: 'transport', viewBox: '0 0 100 100', paths: ['M50 10 L55 10 L55 35 L85 50 L85 55 L55 45 L55 75 L70 85 L70 90 L50 82 L30 90 L30 85 L45 75 L45 45 L15 55 L15 50 L45 35 L45 10 Z'] },
  { id: 'train', name: 'Train', category: 'transport', viewBox: '0 0 100 100', paths: ['M20 25 L80 25 Q85 25 85 30 L85 70 Q85 75 80 75 L20 75 Q15 75 15 70 L15 30 Q15 25 20 25 Z M25 35 L45 35 L45 50 L25 50 Z M55 35 L75 35 L75 50 L55 50 Z M30 60 A5 5 0 1 1 40 60 A5 5 0 1 1 30 60 M60 60 A5 5 0 1 1 70 60 A5 5 0 1 1 60 60 M45 80 L55 80 L58 90 L42 90 Z'] },
  { id: 'ship', name: 'Ship', category: 'transport', viewBox: '0 0 100 100', paths: ['M15 60 L50 60 L50 35 L55 35 L55 60 L85 60 L75 80 L25 80 Z M45 35 L45 20 L55 20 L55 30 M45 25 L30 25 L30 35'] },
  { id: 'bike', name: 'Bicycle', category: 'transport', viewBox: '0 0 100 100', paths: ['M25 55 A15 15 0 1 1 25 85 A15 15 0 1 1 25 55 M75 55 A15 15 0 1 1 75 85 A15 15 0 1 1 75 55 M25 70 L50 45 L75 70 M50 45 L50 30 L60 45 M40 45 L55 45'] },
  { id: 'rocket', name: 'Rocket', category: 'transport', viewBox: '0 0 100 100', paths: ['M50 5 Q70 25 70 55 L70 75 L55 75 L55 95 L45 95 L45 75 L30 75 L30 55 Q30 25 50 5 Z M20 60 L30 50 L30 70 Z M80 60 L70 50 L70 70 Z M50 35 A8 8 0 1 1 50 51 A8 8 0 1 1 50 35'] },
  { id: 'helicopter', name: 'Helicopter', category: 'transport', viewBox: '0 0 100 100', paths: ['M15 45 L85 45 M50 45 L50 35 M40 35 L60 35 M30 50 L70 50 Q80 50 80 60 L80 70 Q80 75 70 75 L30 75 Q20 75 20 70 L20 60 Q20 50 30 50 Z M70 75 L75 85 L80 85 L75 75'] },
  { id: 'bus', name: 'Bus', category: 'transport', viewBox: '0 0 100 100', paths: ['M15 30 L85 30 Q90 30 90 35 L90 70 Q90 75 85 75 L15 75 Q10 75 10 70 L10 35 Q10 30 15 30 Z M20 40 L40 40 L40 55 L20 55 Z M50 40 L70 40 L70 55 L50 55 Z M25 65 A6 6 0 1 1 37 65 A6 6 0 1 1 25 65 M63 65 A6 6 0 1 1 75 65 A6 6 0 1 1 63 65'] },
];

// Symbols (14 icons)
const SYMBOLS_ICONS: IconDef[] = [
  { id: 'star', name: 'Star', category: 'symbols', viewBox: '0 0 100 100', paths: ['M50 10 L58 38 L88 38 L64 56 L74 85 L50 68 L26 85 L36 56 L12 38 L42 38 Z'] },
  { id: 'moon', name: 'Moon', category: 'symbols', viewBox: '0 0 100 100', paths: ['M60 15 Q30 20 25 50 Q20 80 50 85 Q70 87 80 70 Q60 75 50 60 Q45 45 60 15 Z'] },
  { id: 'sun', name: 'Sun', category: 'symbols', viewBox: '0 0 100 100', paths: ['M50 30 A20 20 0 1 1 50 70 A20 20 0 1 1 50 30 M50 5 L50 15 M50 85 L50 95 M5 50 L15 50 M85 50 L95 50 M18 18 L25 25 M75 75 L82 82 M82 18 L75 25 M25 75 L18 82'] },
  { id: 'lightning', name: 'Lightning', category: 'symbols', viewBox: '0 0 100 100', paths: ['M60 5 L25 50 L45 50 L35 95 L75 45 L55 45 Z'] },
  { id: 'diamond', name: 'Diamond', category: 'symbols', viewBox: '0 0 100 100', paths: ['M50 5 L90 35 L50 95 L10 35 Z M10 35 L90 35'] },
  { id: 'crown', name: 'Crown', category: 'symbols', viewBox: '0 0 100 100', paths: ['M10 75 L10 35 L30 50 L50 25 L70 50 L90 35 L90 75 Z M15 80 L85 80 L85 90 L15 90 Z'] },
  { id: 'anchor', name: 'Anchor', category: 'symbols', viewBox: '0 0 100 100', paths: ['M50 25 A10 10 0 1 1 50 45 A10 10 0 1 1 50 25 M50 45 L50 90 M30 90 L70 90 M50 55 L20 55 Q10 55 10 70 Q10 85 25 85 M50 55 L80 55 Q90 55 90 70 Q90 85 75 85'] },
  { id: 'infinity', name: 'Infinity', category: 'symbols', viewBox: '0 0 100 100', paths: ['M25 50 Q10 35 25 35 Q40 35 50 50 Q60 35 75 35 Q90 35 75 50 Q60 65 50 50 Q40 65 25 65 Q10 65 25 50'] },
  { id: 'peace', name: 'Peace', category: 'symbols', viewBox: '0 0 100 100', paths: ['M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10 M50 10 L50 90 M50 50 L25 75 M50 50 L75 75'] },
  { id: 'yin-yang', name: 'Yin Yang', category: 'symbols', viewBox: '0 0 100 100', paths: ['M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10 M50 10 A20 20 0 0 1 50 50 A20 20 0 0 0 50 90 M50 30 A5 5 0 1 1 50 40 A5 5 0 1 1 50 30 M50 60 A5 5 0 1 1 50 70 A5 5 0 1 1 50 60'] },
  { id: 'clover', name: 'Four Leaf Clover', category: 'symbols', viewBox: '0 0 100 100', paths: ['M50 45 Q30 45 30 30 Q30 15 50 25 Q70 15 70 30 Q70 45 50 45 M50 55 Q30 55 30 70 Q30 85 50 75 Q70 85 70 70 Q70 55 50 55 M45 50 Q45 30 30 30 Q15 30 25 50 Q15 70 30 70 Q45 70 45 50 M55 50 Q55 30 70 30 Q85 30 75 50 Q85 70 70 70 Q55 70 55 50 M47 75 L50 95 L53 75'] },
  { id: 'flame', name: 'Flame', category: 'symbols', viewBox: '0 0 100 100', paths: ['M50 10 Q70 30 70 50 Q70 80 50 90 Q30 80 30 50 Q30 30 50 10 Q40 40 45 55 Q50 40 55 55 Q60 40 50 10'] },
  { id: 'snowflake', name: 'Snowflake', category: 'symbols', viewBox: '0 0 100 100', paths: ['M50 10 L50 90 M50 10 L40 20 M50 10 L60 20 M50 90 L40 80 M50 90 L60 80 M15 30 L85 70 M15 30 L25 30 M15 30 L20 40 M85 70 L75 70 M85 70 L80 60 M15 70 L85 30 M15 70 L20 60 M15 70 L25 70 M85 30 L75 30 M85 30 L80 40'] },
  { id: 'hashtag', name: 'Hashtag', category: 'symbols', viewBox: '0 0 100 100', paths: ['M30 20 L25 80 M70 20 L65 80 M15 35 L85 35 M15 60 L85 60'] },
];

// Nature (10 icons)
const NATURE_ICONS: IconDef[] = [
  { id: 'flower', name: 'Flower', category: 'nature', viewBox: '0 0 100 100', paths: ['M50 35 A12 12 0 1 1 50 59 A12 12 0 1 1 50 35 M50 20 Q60 5 70 20 Q80 35 65 40 M65 40 Q85 40 85 55 Q80 70 65 60 M65 60 Q75 80 60 85 Q45 85 50 65 M50 65 Q35 85 20 75 Q15 60 35 55 M35 55 Q15 50 20 35 Q30 20 50 30 M50 60 L50 95'] },
  { id: 'tree', name: 'Tree', category: 'nature', viewBox: '0 0 100 100', paths: ['M50 10 L75 50 L60 50 L80 75 L55 75 L55 95 L45 95 L45 75 L20 75 L40 50 L25 50 Z'] },
  { id: 'leaf', name: 'Leaf', category: 'nature', viewBox: '0 0 100 100', paths: ['M20 80 Q10 50 30 30 Q50 10 80 20 Q70 50 50 70 Q30 90 20 80 Z M25 75 Q40 50 70 25'] },
  { id: 'mountain', name: 'Mountain', category: 'nature', viewBox: '0 0 100 100', paths: ['M10 80 L35 30 L50 50 L65 25 L90 80 Z'] },
  { id: 'wave', name: 'Wave', category: 'nature', viewBox: '0 0 100 100', paths: ['M5 50 Q15 30 30 50 Q45 70 55 50 Q65 30 80 50 Q95 70 95 50 M5 65 Q15 45 30 65 Q45 85 55 65 Q65 45 80 65 Q95 85 95 65'] },
  { id: 'cloud', name: 'Cloud', category: 'nature', viewBox: '0 0 100 100', paths: ['M25 60 Q10 60 10 50 Q10 40 25 40 Q25 25 45 25 Q60 25 65 40 Q80 35 85 50 Q90 65 75 65 Z'] },
  { id: 'rain', name: 'Rain', category: 'nature', viewBox: '0 0 100 100', paths: ['M25 45 Q10 45 10 35 Q10 25 25 25 Q25 15 40 15 Q55 15 58 25 Q70 22 75 32 Q80 45 70 45 Z M25 55 L20 70 M40 55 L35 75 M55 55 L50 70 M70 55 L65 75'] },
  { id: 'rainbow', name: 'Rainbow', category: 'nature', viewBox: '0 0 100 100', paths: ['M10 70 Q10 30 50 30 Q90 30 90 70 M20 70 Q20 40 50 40 Q80 40 80 70 M30 70 Q30 50 50 50 Q70 50 70 70'] },
  { id: 'cactus', name: 'Cactus', category: 'nature', viewBox: '0 0 100 100', paths: ['M40 90 L40 30 Q40 20 50 20 Q60 20 60 30 L60 90 Z M40 50 L30 50 Q20 50 20 60 L20 70 L30 70 L30 60 L40 60 M60 40 L70 40 Q80 40 80 50 L80 60 L70 60 L70 50 L60 50'] },
  { id: 'mushroom', name: 'Mushroom', category: 'nature', viewBox: '0 0 100 100', paths: ['M20 50 Q20 20 50 20 Q80 20 80 50 Z M40 50 L40 85 L60 85 L60 50 M35 35 A5 5 0 1 1 35 45 A5 5 0 1 1 35 35 M55 30 A4 4 0 1 1 55 38 A4 4 0 1 1 55 30 M65 40 A3 3 0 1 1 65 46 A3 3 0 1 1 65 40'] },
];

// Home & Food (10 icons)
const HOME_ICONS: IconDef[] = [
  { id: 'home', name: 'Home', category: 'home', viewBox: '0 0 100 100', paths: ['M50 10 L10 45 L20 45 L20 90 L80 90 L80 45 L90 45 Z M40 90 L40 60 L60 60 L60 90'] },
  { id: 'key', name: 'Key', category: 'home', viewBox: '0 0 100 100', paths: ['M30 30 A15 15 0 1 1 30 60 A15 15 0 1 1 30 30 M45 45 L85 45 L85 55 L75 55 L75 65 L65 65 L65 55 L45 55 Z'] },
  { id: 'coffee', name: 'Coffee', category: 'home', viewBox: '0 0 100 100', paths: ['M20 30 L20 80 Q20 90 30 90 L60 90 Q70 90 70 80 L70 30 Z M70 40 L80 40 Q90 40 90 55 Q90 70 80 70 L70 70 M30 20 Q35 10 40 20 M45 20 Q50 10 55 20 M60 20 Q65 10 70 20'] },
  { id: 'cake', name: 'Birthday Cake', category: 'home', viewBox: '0 0 100 100', paths: ['M20 45 L80 45 L80 85 L20 85 Z M30 45 L30 35 M50 45 L50 35 M70 45 L70 35 M30 30 A5 5 0 1 1 30 20 A5 5 0 1 1 30 30 M50 30 A5 5 0 1 1 50 20 A5 5 0 1 1 50 30 M70 30 A5 5 0 1 1 70 20 A5 5 0 1 1 70 30 M20 60 Q35 55 50 60 Q65 65 80 60'] },
  { id: 'gift', name: 'Gift', category: 'home', viewBox: '0 0 100 100', paths: ['M15 40 L85 40 L85 90 L15 90 Z M15 40 L15 55 L85 55 L85 40 Z M50 40 L50 90 M35 40 Q25 30 35 20 Q50 15 50 40 M65 40 Q75 30 65 20 Q50 15 50 40'] },
  { id: 'pizza', name: 'Pizza', category: 'home', viewBox: '0 0 100 100', paths: ['M50 15 L15 85 Q50 95 85 85 Z M35 50 A5 5 0 1 1 35 60 A5 5 0 1 1 35 50 M55 55 A4 4 0 1 1 55 63 A4 4 0 1 1 55 55 M50 35 A3 3 0 1 1 50 41 A3 3 0 1 1 50 35 M65 65 A4 4 0 1 1 65 73 A4 4 0 1 1 65 65'] },
  { id: 'icecream', name: 'Ice Cream', category: 'home', viewBox: '0 0 100 100', paths: ['M35 50 L50 95 L65 50 Z M50 20 A20 20 0 0 1 70 40 Q70 50 50 50 Q30 50 30 40 A20 20 0 0 1 50 20'] },
  { id: 'cupcake', name: 'Cupcake', category: 'home', viewBox: '0 0 100 100', paths: ['M25 50 L35 90 L65 90 L75 50 Z M25 50 Q25 35 50 35 Q75 35 75 50 Z M50 35 L50 20 M45 20 A5 5 0 1 1 55 20 A5 5 0 1 1 45 20'] },
  { id: 'wine', name: 'Wine Glass', category: 'home', viewBox: '0 0 100 100', paths: ['M30 10 L30 35 Q30 55 50 55 Q70 55 70 35 L70 10 Z M50 55 L50 80 M35 85 L65 85 L65 90 L35 90 Z M30 30 L70 30'] },
  { id: 'cocktail', name: 'Cocktail', category: 'home', viewBox: '0 0 100 100', paths: ['M25 15 L75 15 L50 50 Z M50 50 L50 80 M35 85 L65 85 L65 90 L35 90 Z M30 25 L70 25 M60 35 A5 5 0 1 1 70 35 A5 5 0 1 1 60 35'] },
];

// Combine all icons
export const ICON_PACK_V2: IconDef[] = [
  ...GAMING_ICONS,
  ...ANIMALS_ICONS,
  ...HEARTS_ICONS,
  ...HOBBIES_ICONS,
  ...SPORTS_ICONS,
  ...BABY_ICONS,
  ...TRANSPORT_ICONS,
  ...SYMBOLS_ICONS,
  ...NATURE_ICONS,
  ...HOME_ICONS,
];

// Icon categories
export const ICON_CATEGORIES_V2 = [
  { id: 'gaming', label: 'Gaming', count: GAMING_ICONS.length },
  { id: 'animals', label: 'Animals', count: ANIMALS_ICONS.length },
  { id: 'hearts', label: 'Hearts', count: HEARTS_ICONS.length },
  { id: 'hobbies', label: 'Hobbies', count: HOBBIES_ICONS.length },
  { id: 'sports', label: 'Sports', count: SPORTS_ICONS.length },
  { id: 'baby', label: 'Baby', count: BABY_ICONS.length },
  { id: 'transport', label: 'Transport', count: TRANSPORT_ICONS.length },
  { id: 'symbols', label: 'Symbols', count: SYMBOLS_ICONS.length },
  { id: 'nature', label: 'Nature', count: NATURE_ICONS.length },
  { id: 'home', label: 'Home & Food', count: HOME_ICONS.length },
];

// Total icon count
export const ICON_COUNT = ICON_PACK_V2.length;

/**
 * Get icon by ID
 */
export function getIconByIdV2(id: string): IconDef | null {
  return ICON_PACK_V2.find(icon => icon.id === id) || null;
}

/**
 * Get icons by category
 */
export function getIconsByCategoryV2(category: string): IconDef[] {
  return ICON_PACK_V2.filter(icon => icon.category === category);
}

/**
 * Search icons
 */
export function searchIconsV2(query: string): IconDef[] {
  const q = query.toLowerCase().trim();
  if (!q) return ICON_PACK_V2;
  return ICON_PACK_V2.filter(icon =>
    icon.name.toLowerCase().includes(q) ||
    icon.id.toLowerCase().includes(q) ||
    icon.category.toLowerCase().includes(q)
  );
}
