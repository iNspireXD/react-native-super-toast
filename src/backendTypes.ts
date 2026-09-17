import type { NativeToastOptions } from './NativeSuperToast';

export type ToastEventType =
  | 'press'
  | 'action'
  | 'cancel'
  | 'dismiss'
  | 'autoClose'
  | 'removed';

export type ToastEvent = {
  id: string;
  type: ToastEventType;
};

export type ToastEventListener = (event: ToastEvent) => void;

/** The native renderer: dialog windows on Android, an overlay window on iOS. */
export type ToastBackend = {
  show(options: NativeToastOptions): void;
  dismiss(id: string | null): void;
  wiggle(id: string): void;
  addListener(listener: ToastEventListener): () => void;
};
