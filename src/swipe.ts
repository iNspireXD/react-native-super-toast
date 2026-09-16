import type { ToastSwipeDirection } from './types';

export function isHorizontalSwipe(direction: ToastSwipeDirection): boolean {
  return direction === 'left' || direction === 'right';
}

/** Normalizes movement so the configured dismiss direction is always negative. */
export function normalizeSwipeOffset(
  direction: ToastSwipeDirection,
  dx: number,
  dy: number
): number {
  const offset = isHorizontalSwipe(direction) ? dx : dy;
  return direction === 'right' || direction === 'down' ? -offset : offset;
}

/** Converts a normalized offset back into screen coordinates for rendering. */
export function swipeTranslation(
  direction: ToastSwipeDirection,
  offset: number
): number {
  return direction === 'right' || direction === 'down' ? -offset : offset;
}
