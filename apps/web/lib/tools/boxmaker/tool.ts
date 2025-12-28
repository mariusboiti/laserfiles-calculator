import type { ReactNode } from 'react';
import { BoxMakerTool } from './ui/BoxMakerTool';

/**
 * BoxMaker Tool Metadata
 * 
 * Defines the tool's configuration for the Studio registry.
 */
export const boxmakerTool = {
  slug: 'boxmaker',
  title: 'BoxMaker',
  description: 'Generate laser-ready finger-joint boxes as SVG.',
  access: {
    free: true,
    proFeatures: ['lid', 'hinges', 'batch export'],
  },
  Component: BoxMakerTool,
} as const;

/**
 * Studio Tool Contract
 * 
 * Type definition for all tools in the Studio registry.
 */
export type StudioTool = {
  slug: string;
  title: string;
  description: string;
  access: { free: boolean; proFeatures?: string[] };
  Component: () => ReactNode;
};
