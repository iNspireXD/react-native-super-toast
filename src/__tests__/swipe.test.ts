import { describe, expect, it } from '@jest/globals';

import {
  isHorizontalSwipe,
  normalizeSwipeOffset,
  swipeTranslation,
} from '../swipe';
import type { ToastSwipeDirection } from '../types';

describe.each<[ToastSwipeDirection, number, number, number]>([
  ['up', 0, -40, -40],
  ['down', 0, 40, -40],
  ['left', -40, 0, -40],
  ['right', 40, 0, -40],
])('%s swipe', (direction, dx, dy, normalized) => {
  it('normalizes movement toward the dismiss edge', () => {
    expect(normalizeSwipeOffset(direction, dx, dy)).toBe(normalized);
  });

  it('translates the normalized value in the visible direction', () => {
    const expected = direction === 'right' || direction === 'down' ? 40 : -40;
    expect(swipeTranslation(direction, normalized)).toBe(expected);
  });
});

it('identifies horizontal directions', () => {
  expect(isHorizontalSwipe('left')).toBe(true);
  expect(isHorizontalSwipe('right')).toBe(true);
  expect(isHorizontalSwipe('up')).toBe(false);
  expect(isHorizontalSwipe('down')).toBe(false);
});
