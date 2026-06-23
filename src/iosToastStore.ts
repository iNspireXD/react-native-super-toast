import { TurboModuleRegistry } from 'react-native';

import type { NativeToastOptions, Spec } from './nativeTypes';

export type ResolvedToast = Required<
  Pick<
    NativeToastOptions,
    | 'id'
    | 'kind'
    | 'duration'
    | 'position'
    | 'widthMode'
    | 'animation'
    | 'enterDuration'
    | 'exitDuration'
    | 'topOffset'
    | 'bottomOffset'
    | 'maxWidth'
    | 'horizontalMargin'
    | 'backgroundColor'
    | 'titleColor'
    | 'messageColor'
    | 'iconColor'
    | 'borderColor'
    | 'borderWidth'
    | 'borderRadius'
    | 'paddingHorizontal'
    | 'paddingVertical'
    | 'gap'
    | 'titleSize'
    | 'messageSize'
    | 'elevation'
    | 'shadowOpacity'
    | 'swipeToDismiss'
    | 'closeOnPress'
    | 'haptic'
    | 'queue'
    | 'stack'
    | 'stackLimit'
    | 'stackOffset'
  >
> &
  Pick<
    NativeToastOptions,
    'title' | 'message' | 'icon' | 'titleFontFamily' | 'messageFontFamily'
  > & {
    revision: number;
  };

type ToastSnapshot = {
  current: ResolvedToast | null;
  dismissing: boolean;
  stacked: ResolvedToast[];
  stackedDismissingIds: string[];
};

const palette = {
  default: { background: '#1F2937', icon: '#FFFFFF' },
  success: { background: '#166534', icon: '#BBF7D0' },
  error: { background: '#7F1D1D', icon: '#FECACA' },
  warning: { background: '#713F12', icon: '#FEF08A' },
  info: { background: '#1E40AF', icon: '#BFDBFE' },
  loading: { background: '#3F3F46', icon: '#FFFFFF' },
} as const;

const initialDefaults: Omit<
  ResolvedToast,
  'id' | 'title' | 'message' | 'icon' | 'revision'
> = {
  kind: 'default',
  duration: 3000,
  position: 'top',
  widthMode: 'content',
  animation: 'slide',
  enterDuration: 320,
  exitDuration: 230,
  topOffset: 48,
  bottomOffset: 48,
  maxWidth: 420,
  horizontalMargin: 16,
  backgroundColor: palette.default.background,
  titleColor: '#FFFFFF',
  messageColor: '#FFFFFF',
  iconColor: palette.default.icon,
  borderColor: 'transparent',
  borderWidth: 0,
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 12,
  gap: 8,
  titleSize: 15,
  messageSize: 14,
  elevation: 8,
  shadowOpacity: 0.18,
  swipeToDismiss: true,
  closeOnPress: false,
  haptic: false,
  queue: true,
  stack: false,
  stackLimit: 3,
  stackOffset: 10,
};

let defaults: NativeToastOptions = {};
let current: ResolvedToast | null = null;
let toastQueue: ResolvedToast[] = [];
let dismissing = false;
let stackedToasts: ResolvedToast[] = [];
let stackedDismissingIds = new Set<string>();
let snapshot: ToastSnapshot = {
  current,
  dismissing,
  stacked: stackedToasts,
  stackedDismissingIds: [],
};
const listeners = new Set<() => void>();

function makeId(): string {
  return `super-toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emit(): void {
  snapshot = {
    current,
    dismissing,
    stacked: stackedToasts,
    stackedDismissingIds: [...stackedDismissingIds],
  };
  listeners.forEach((listener) => listener());
}

function resolveToast(options: NativeToastOptions): ResolvedToast {
  const merged = { ...defaults, ...options };
  const kind = merged.kind ?? initialDefaults.kind;
  const colors = palette[kind as keyof typeof palette] ?? palette.default;

  return {
    ...initialDefaults,
    ...merged,
    id: merged.id ?? makeId(),
    kind,
    revision: 0,
    enterDuration: Math.max(
      0,
      merged.enterDuration ?? initialDefaults.enterDuration
    ),
    exitDuration: Math.max(
      0,
      merged.exitDuration ?? initialDefaults.exitDuration
    ),
    backgroundColor: merged.backgroundColor ?? colors.background,
    iconColor: merged.iconColor ?? colors.icon,
  };
}

export function show(options: NativeToastOptions): string {
  const toast = resolveToast(options);

  if (toast.stack && toast.position !== 'center') {
    current = null;
    toastQueue = [];
    dismissing = false;
    stackedToasts = [...stackedToasts, toast].slice(-toast.stackLimit);
    stackedDismissingIds = new Set(
      [...stackedDismissingIds].filter((id) =>
        stackedToasts.some((stackedToast) => stackedToast.id === id)
      )
    );
    emit();
  } else if (!toast.queue) {
    stackedToasts = [];
    stackedDismissingIds = new Set();
    toastQueue = [];
    current = toast;
    dismissing = false;
    emit();
  } else if (current) {
    toastQueue = [...toastQueue, toast];
  } else {
    stackedToasts = [];
    stackedDismissingIds = new Set();
    current = toast;
    dismissing = false;
    emit();
  }

  return toast.id;
}

function updateToast(
  toast: ResolvedToast,
  options: NativeToastOptions
): ResolvedToast {
  const kind = options.kind ?? toast.kind;
  const kindChanged = kind !== toast.kind;
  const colors = palette[kind as keyof typeof palette] ?? palette.default;

  return {
    ...toast,
    ...options,
    id: toast.id,
    kind,
    revision: toast.revision + 1,
    enterDuration: Math.max(0, options.enterDuration ?? toast.enterDuration),
    exitDuration: Math.max(0, options.exitDuration ?? toast.exitDuration),
    icon:
      options.icon !== undefined
        ? options.icon
        : kindChanged
          ? undefined
          : toast.icon,
    backgroundColor:
      options.backgroundColor ??
      (kindChanged ? colors.background : toast.backgroundColor),
    iconColor:
      options.iconColor ?? (kindChanged ? colors.icon : toast.iconColor),
  };
}

export function update(id: string, options: NativeToastOptions): void {
  const stackedIndex = stackedToasts.findIndex((toast) => toast.id === id);
  if (stackedIndex >= 0) {
    stackedToasts = stackedToasts.map((toast) =>
      toast.id === id ? updateToast(toast, options) : toast
    );
    stackedDismissingIds.delete(id);
    emit();
    return;
  }

  if (current?.id === id) {
    current = updateToast(current, options);
    dismissing = false;
    emit();
    return;
  }

  toastQueue = toastQueue.map((toast) =>
    toast.id === id ? updateToast(toast, options) : toast
  );
}

export function dismiss(id: string | null): void {
  const stackedId = id ?? stackedToasts.at(-1)?.id;
  if (
    stackedId &&
    stackedToasts.some((toast) => toast.id === stackedId) &&
    !stackedDismissingIds.has(stackedId)
  ) {
    stackedDismissingIds = new Set(stackedDismissingIds).add(stackedId);
    emit();
    return;
  }

  if (!id || current?.id === id) {
    if (current && !dismissing) {
      dismissing = true;
      emit();
    }
    return;
  }

  toastQueue = toastQueue.filter((toast) => toast.id !== id);
}

export function dismissAll(): void {
  toastQueue = [];
  if (stackedToasts.length > 0) {
    stackedDismissingIds = new Set(stackedToasts.map((toast) => toast.id));
    emit();
  } else {
    dismiss(null);
  }
}

export function configure(nextDefaults: NativeToastOptions): void {
  defaults = { ...defaults, ...nextDefaults };
}

export function completeDismiss(id: string): void {
  if (stackedToasts.some((toast) => toast.id === id)) {
    stackedToasts = stackedToasts.filter((toast) => toast.id !== id);
    stackedDismissingIds = new Set(
      [...stackedDismissingIds].filter((toastId) => toastId !== id)
    );
    emit();
    return;
  }

  if (current?.id !== id) return;

  current = toastQueue[0] ?? null;
  toastQueue = toastQueue.slice(1);
  dismissing = false;
  emit();
}

export function triggerHaptic(): void {
  TurboModuleRegistry.get<Spec>('SuperToast')?.triggerHaptic();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): ToastSnapshot {
  return snapshot;
}
