import type { BoxSettings } from './types'

export type SimpleBoxTemplateId = 'small_gift' | 'photo' | 'ornament' | 'storage'

export function getSimpleTemplateSettings(id: SimpleBoxTemplateId): Partial<BoxSettings> {
  if (id === 'photo') {
    return {
      width: 180,
      depth: 130,
      height: 40,
      lidType: 'flat_lid',
      boxType: 'finger_all_edges',
      materialThickness: 3,
      dividersEnabled: false,
    }
  }

  if (id === 'ornament') {
    return {
      width: 120,
      depth: 120,
      height: 35,
      lidType: 'sliding_lid',
      boxType: 'finger_all_edges',
      materialThickness: 3,
      dividersEnabled: false,
    }
  }

  if (id === 'storage') {
    return {
      width: 250,
      depth: 180,
      height: 120,
      lidType: 'none',
      boxType: 'finger_all_edges',
      materialThickness: 3,
      dividersEnabled: false,
    }
  }

  return {
    width: 100,
    depth: 100,
    height: 60,
    lidType: 'flat_lid',
    boxType: 'finger_all_edges',
    materialThickness: 3,
    dividersEnabled: false,
  }
}
