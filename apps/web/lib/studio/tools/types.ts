import type { ComponentType } from 'react';
import type { StudioToolStatus } from './meta';

export type Plan = 'free' | 'pro';

export type StudioTool = {
  slug: string;
  title: string;
  description: string;
  proFeatures?: string[];
  status: StudioToolStatus;
  usesAI?: boolean;
  Component: ComponentType<any>;
};
