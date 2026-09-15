import { TurboModuleRegistry } from 'react-native';

import type { NativeToastOptions, Spec } from './NativeSuperToast';
import type { ToastEventListener, ToastEventType } from './backendTypes';

export type StoreToast = {
  /** Unique per presentation, so a re-shown id never reuses an exiting card. */
  key: number;
  options: NativeToastOptions;
  dismissing: boolean;
  revision: number;
  wiggle: number;
};

type ToastSnapshot = {
  toasts: StoreToast[];
};

let toasts: StoreToast[] = [];
let snapshot: ToastSnapshot = { toasts };
let nextKey = 1;
const listeners = new Set<() => void>();
const eventListeners = new Set<ToastEventListener>();

function commit(next: StoreToast[]): void {
  toasts = next;
  snapshot = { toasts };
  listeners.forEach((listener) => listener());
}

function emitEvent(id: string, type: ToastEventType): void {
  eventListeners.forEach((listener) => listener({ id, type }));
}

function findActive(id: string): StoreToast | undefined {
  return toasts.find((toast) => toast.options.id === id && !toast.dismissing);
}

export function show(options: NativeToastOptions): void {
  const existing = findActive(options.id);
  let next = existing
    ? toasts.map((toast) =>
        toast === existing
          ? { ...toast, options, revision: toast.revision + 1 }
          : toast
      )
    : [
        ...toasts.filter((toast) => toast.options.id !== options.id),
        {
          key: nextKey++,
          options,
          dismissing: false,
          revision: 0,
          wiggle: 0,
        },
      ];

  const active = next.filter(
    (toast) => !toast.dismissing && toast.options.position === options.position
  );
  const overflow = active.length - options.visibleToasts;
  if (overflow > 0) {
    const evicted = new Set(active.slice(0, overflow));
    next = next.map((toast) =>
      evicted.has(toast) ? { ...toast, dismissing: true } : toast
    );
  }

  commit(next);
}

export function dismiss(id: string | null): void {
  let changed = false;
  const next = toasts.map((toast) => {
    if (toast.dismissing || (id !== null && toast.options.id !== id)) {
      return toast;
    }
    changed = true;
    return { ...toast, dismissing: true };
  });
  if (changed) commit(next);
}

/** Dismissal started by the toast itself: a button, swipe, or timer. */
export function dismissFromToast(
  id: string,
  type: Extract<ToastEventType, 'action' | 'cancel' | 'dismiss' | 'autoClose'>
): void {
  if (!findActive(id)) return;
  emitEvent(id, type);
  dismiss(id);
}

export function press(id: string): void {
  emitEvent(id, 'press');
}

export function wiggle(id: string): void {
  const target = findActive(id);
  if (!target) return;
  commit(
    toasts.map((toast) =>
      toast === target ? { ...toast, wiggle: toast.wiggle + 1 } : toast
    )
  );
}

export function completeRemove(key: number): void {
  const removed = toasts.find((toast) => toast.key === key);
  if (!removed) return;
  commit(toasts.filter((toast) => toast !== removed));
  emitEvent(removed.options.id, 'removed');
}

export function triggerHaptic(): void {
  TurboModuleRegistry.get<Spec>('SuperToast')?.triggerHaptic();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addEventListener(listener: ToastEventListener): () => void {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

export function getSnapshot(): ToastSnapshot {
  return snapshot;
}
