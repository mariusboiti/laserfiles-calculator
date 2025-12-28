import type { ComponentType } from 'react';

export type Plan = 'free' | 'pro';

export type StudioTool = {
  slug: string;
  title: string;
  description: string;
  proFeatures?: string[];
  Component: ComponentType<any>;
};
