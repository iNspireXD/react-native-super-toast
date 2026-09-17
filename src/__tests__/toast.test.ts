import { beforeEach, expect, it, jest } from '@jest/globals';

import NativeSuperToast from '../NativeSuperToast';

import type { NativeToastEvent, NativeToastOptions } from '../NativeSuperToast';
import { toast } from '../toast';

type Listener = (event: NativeToastEvent) => void;

jest.mock('../NativeSuperToast', () => {
  const listeners = new Set<Listener>();
  return {
    __esModule: true,
    default: {
      listeners,
      show: jest.fn(),
      dismiss: jest.fn(),
      wiggle: jest.fn(),
      onToastEvent: (listener: Listener) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
      },
    },
  };
});

const mockNative = NativeSuperToast as unknown as {
  listeners: Set<Listener>;
  show: jest.Mock<(options: NativeToastOptions) => void>;
  dismiss: jest.Mock<(id: string | null) => void>;
  wiggle: jest.Mock<(id: string) => void>;
};

function emit(id: string | number, type: string) {
  mockNative.listeners.forEach((listener) =>
    listener({ id: String(id), type })
  );
}

function lastShown(): NativeToastOptions {
  const calls = mockNative.show.mock.calls;
  return calls[calls.length - 1]![0];
}

const settlePromises = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  toast.dismiss();
  mockNative.show.mockClear();
  mockNative.dismiss.mockClear();
  mockNative.wiggle.mockClear();
});

it('shows each variant with the default options', () => {
  const id = toast.success('Saved', { description: 'All good' });

  expect(lastShown()).toMatchObject({
    id: String(id),
    variant: 'success',
    title: 'Saved',
    description: 'All good',
    duration: 4000,
    position: 'top-center',
    dismissible: true,
    closeButton: false,
    iconColor: '#ff3c8643',
  });

  toast.loading('Working');
  expect(lastShown()).toMatchObject({ variant: 'loading', duration: 0 });
});

it('converts colors to #AARRGGBB for native rendering', () => {
  toast('Styled', { style: { backgroundColor: 'red' } });

  expect(lastShown().style.backgroundColor).toBe('#ffff0000');
});

it('reuses the id when a toast is updated in place', () => {
  toast('Uploading', { id: 'upload' });
  toast.success('Uploaded', { id: 'upload' });

  expect(mockNative.show).toHaveBeenCalledTimes(2);
  expect(lastShown()).toMatchObject({
    id: 'upload',
    variant: 'success',
    title: 'Uploaded',
  });
});

it('routes button, press, and timer events to callbacks once', () => {
  const onClick = jest.fn();
  const onCancel = jest.fn();
  const onDismiss = jest.fn();
  const onAutoClose = jest.fn();
  const onPress = jest.fn();

  const actionId = toast('Deleted', {
    action: { label: 'Undo', onClick },
    onDismiss,
    onPress,
  });
  emit(actionId, 'press');
  emit(actionId, 'action');
  toast.dismiss(actionId);

  expect(onPress).toHaveBeenCalledTimes(1);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onDismiss).not.toHaveBeenCalled();

  const cancelId = toast('Leave?', {
    cancel: { label: 'Stay', onClick: onCancel },
    onDismiss,
  });
  emit(cancelId, 'cancel');
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onDismiss).toHaveBeenCalledWith(cancelId);

  const timedId = toast('Timed', { onAutoClose, onDismiss });
  emit(timedId, 'autoClose');
  toast.dismiss(timedId);
  expect(onAutoClose).toHaveBeenCalledWith(timedId);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it('calls onDismiss for programmatic dismissal', () => {
  const onDismiss = jest.fn();
  const id = toast('Bye', { onDismiss });

  toast.dismiss(id);

  expect(onDismiss).toHaveBeenCalledWith(id);
  expect(mockNative.dismiss).toHaveBeenCalledWith(String(id));
});

it('resolves promise toasts', async () => {
  const id = toast.promise(Promise.resolve(42), {
    loading: 'Loading',
    success: (value) => `Loaded ${value}`,
    error: 'Failed',
  });

  expect(lastShown()).toMatchObject({ variant: 'loading', dismissible: false });

  await settlePromises();

  expect(lastShown()).toMatchObject({
    id: String(id),
    variant: 'success',
    title: 'Loaded 42',
    dismissible: true,
  });
});

it('resolves rejected promise toasts', async () => {
  toast.promise(() => Promise.reject(new Error('nope')), {
    loading: 'Loading',
    success: 'Done',
    error: (reason) => (reason as Error).message,
  });

  await settlePromises();

  expect(lastShown()).toMatchObject({ variant: 'error', title: 'nope' });
});

it('does not resolve a promise toast the user dismissed', async () => {
  const id = toast.promise(Promise.resolve(1), {
    loading: 'Loading',
    success: 'Done',
    error: 'Failed',
  });
  emit(id, 'dismiss');
  mockNative.show.mockClear();

  await settlePromises();

  expect(mockNative.show).not.toHaveBeenCalled();
});

it('forwards wiggle to native', () => {
  const id = toast('Look here');
  toast.wiggle(id);
  expect(mockNative.wiggle).toHaveBeenCalledWith(String(id));
});
