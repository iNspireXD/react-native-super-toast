import { backend } from './backend';
import type { ToastEvent } from './backendTypes';
import { resolveToast } from './resolve';
import type {
  PromiseOptions,
  ToastId,
  ToastOptions,
  ToastVariant,
} from './types';

type Entry = {
  id: ToastId;
  options: ToastOptions;
  /** Set once the toast has been dismissed, so callbacks fire only once. */
  closed: boolean;
};

const entries = new Map<string, Entry>();
let nextId = 1;

function show(
  title: string,
  variant: ToastVariant,
  options: ToastOptions = {}
): ToastId {
  const id = options.id ?? nextId++;
  const key = String(id);
  entries.set(key, { id, options, closed: false });
  backend.show(resolveToast(key, title, variant, options));
  return id;
}

function close(key: string, notify: (entry: Entry) => void): void {
  const entry = entries.get(key);
  if (!entry || entry.closed) return;
  entry.closed = true;
  notify(entry);
}

function handleEvent({ id: key, type }: ToastEvent): void {
  const entry = entries.get(key);
  if (!entry) return;

  switch (type) {
    case 'press':
      entry.options.onPress?.();
      break;
    case 'action':
      close(key, ({ options }) => options.action?.onClick());
      break;
    case 'cancel':
      close(key, ({ id, options }) => {
        options.cancel?.onClick();
        options.onDismiss?.(id);
      });
      break;
    case 'dismiss':
      close(key, ({ id, options }) => options.onDismiss?.(id));
      break;
    case 'autoClose':
      close(key, ({ id, options }) => options.onAutoClose?.(id));
      break;
    case 'removed':
      entries.delete(key);
      break;
  }
}

backend.addListener(handleEvent);

function dismiss(id?: ToastId): ToastId | undefined {
  if (id === undefined) {
    for (const key of entries.keys()) {
      close(key, (entry) => entry.options.onDismiss?.(entry.id));
    }
    backend.dismiss(null);
    return undefined;
  }

  const key = String(id);
  close(key, (entry) => entry.options.onDismiss?.(entry.id));
  backend.dismiss(key);
  return id;
}

function promise<T>(
  value: Promise<T> | (() => Promise<T>),
  { loading, success, error, ...options }: PromiseOptions<T>
): ToastId {
  const id = show(loading, 'loading', { dismissible: false, ...options });
  const key = String(id);

  const settle = (title: string, variant: ToastVariant) => {
    const entry = entries.get(key);
    // A toast the user already dismissed stays dismissed.
    if (!entry || entry.closed) return;
    show(title, variant, { ...options, id });
  };

  new Promise<T>((resolve) =>
    resolve(typeof value === 'function' ? value() : value)
  ).then(
    (result) =>
      settle(
        typeof success === 'function' ? success(result) : success,
        'success'
      ),
    (reason: unknown) =>
      settle(typeof error === 'function' ? error(reason) : error, 'error')
  );

  return id;
}

type ShowToast = (title: string, options?: ToastOptions) => ToastId;

export const toast: ShowToast & {
  success: ShowToast;
  error: ShowToast;
  warning: ShowToast;
  info: ShowToast;
  loading: ShowToast;
  promise: typeof promise;
  dismiss: typeof dismiss;
  wiggle: (id: ToastId) => void;
} = Object.assign(
  (title: string, options?: ToastOptions) => show(title, 'default', options),
  {
    success: (title: string, options?: ToastOptions) =>
      show(title, 'success', options),
    error: (title: string, options?: ToastOptions) =>
      show(title, 'error', options),
    warning: (title: string, options?: ToastOptions) =>
      show(title, 'warning', options),
    info: (title: string, options?: ToastOptions) =>
      show(title, 'info', options),
    loading: (title: string, options?: ToastOptions) =>
      show(title, 'loading', options),
    promise,
    dismiss,
    wiggle: (id: ToastId) => backend.wiggle(String(id)),
  }
);
