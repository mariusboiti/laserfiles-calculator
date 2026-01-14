 import { Metadata } from 'next';
 import HelpContent from './HelpContent';
 
 export const metadata: Metadata = {
  title: 'Help & Documentation – LaserFilesPro Studio',
  description: 'Learn how to use LaserFilesPro Studio tools for laser cutting design and production.',
 };
 
 export default function StudioHelpPage() {
  return <HelpContent />;
 }
