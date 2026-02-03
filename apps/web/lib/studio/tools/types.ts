import type { ComponentType } from 'react';
import type { StudioToolStatus } from './meta';

export type Plan = 'free' | 'pro';

export type StudioTool = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  proFeatures?: string[];
  status: StudioToolStatus;
  usesAI?: boolean;
  isFree?: boolean;
  isSemiFree?: boolean;
  freeFeatures?: string[];
  blockedFeatures?: string[];
  Component: ComponentType<any>;
};
