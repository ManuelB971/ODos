import type { BottomSheetState } from '@/components/map/BottomSheet';

/** Padding caméra MapLibre (px) selon l’état du bottom sheet — garde pins et bounds visibles. */
export function mapCameraPaddingForSheet(state: BottomSheetState): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  switch (state) {
    case 'collapsed':
      return { top: 128, bottom: 140, left: 28, right: 28 };
    case 'full':
      return { top: 128, bottom: 48, left: 28, right: 28 };
    case 'half':
    default:
      return { top: 128, bottom: 260, left: 28, right: 28 };
  }
}
