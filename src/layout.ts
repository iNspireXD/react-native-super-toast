export const STACK_GAP = 8;

export type LayoutItem = {
  id: string;
  height: number;
};

export type LayoutTarget = {
  /** Distance of the card's leading edge from the position anchor. */
  distance: number;
  scale: number;
  depth: number;
};

/**
 * Mirrors ToastDialogHost.layout on Android. `items` are ordered newest first.
 * Listed toasts sit one after another; stacked toasts align to the front card
 * and peek out by STACK_GAP per layer.
 */
export function computeLayout(
  items: LayoutItem[],
  { enableStacking, gap }: { enableStacking: boolean; gap: number }
): Record<string, LayoutTarget> {
  const result: Record<string, LayoutTarget> = {};
  const frontHeight = items[0]?.height ?? 0;
  let cursor = 0;

  items.forEach((item, depth) => {
    result[item.id] = enableStacking
      ? {
          distance: Math.max(0, frontHeight - item.height) + depth * STACK_GAP,
          scale: Math.max(0.85, 1 - depth * 0.05),
          depth,
        }
      : { distance: cursor, scale: 1, depth };
    cursor += item.height + gap;
  });

  return result;
}
