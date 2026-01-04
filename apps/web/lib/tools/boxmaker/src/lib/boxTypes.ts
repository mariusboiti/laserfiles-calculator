import type { BoxType, LidType } from './types'

export const BOX_TYPES: { value: BoxType; label: string; description: string }[] = [
  {
    value: 'finger_vertical_edges',
    label: 'Finger joints (vertical edges only)',
    description: 'Finger joints on vertical edges; horizontal edges are simple.',
  },
  {
    value: 'finger_all_edges',
    label: 'Finger joints (all edges)',
    description: 'Finger joints on all edges for maximum strength.',
  },
]

export const LID_TYPES: { value: LidType; label: string }[] = [
  { value: 'none', label: 'Open box (no lid)' },
  { value: 'flat_lid', label: 'Flat lid' },
  { value: 'flat_lid_with_lip', label: 'Flat lid with inner lip' },
  { value: 'sliding_lid', label: 'Sliding lid' },
]
