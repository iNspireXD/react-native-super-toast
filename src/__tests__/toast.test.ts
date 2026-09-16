import { beforeEach, expect, it, jest } from '@jest/globals';

import {
  completeRemove,
  dismissFromToast,
  getSnapshot,
  press,
} from '../iosToastStore';
import { toast } from '../toast';

function removeAll() {
  toast.dismiss();
  getSnapshot().toasts.forEach(({ key }) => completeRemove(key));
}

const settlePromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function activeToasts() {
  return getSnapshot().toasts.filter(({ dismissing }) => !dismissing);
}

beforeEach(removeAll);

it('shows each variant with the default options', () => {
  const id = toast.success('Saved', { description: 'All good' });

  expect(activeToasts()).toHaveLength(1);
  expect(activeToasts()[0]?.options).toMatchObject({
    id: String(id),
    variant: 'success',
    title: 'Saved',
    description: 'All good',
    duration: 4000,
    position: 'top-center',
    dismissible: true,
    closeButton: false,
    iconColor: '#3c8643',
  });

  toast.loading('Working');
  expect(activeToasts()[1]?.options).toMatchObject({
    variant: 'loading',
    duration: 0,
  });
});

it('updates a toast in place when an id is reused', () => {
  toast('Uploading', { id: 'upload' });
  toast.success('Uploaded', { id: 'upload' });

  expect(activeToasts()).toHaveLength(1);
  expect(activeToasts()[0]).toMatchObject({
    revision: 1,
    options: { id: 'upload', variant: 'success', title: 'Uploaded' },
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
  press(String(actionId));
  dismissFromToast(String(actionId), 'action');
  toast.dismiss(actionId);

  expect(onPress).toHaveBeenCalledTimes(1);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onDismiss).not.toHaveBeenCalled();

  const cancelId = toast('Leave?', {
    cancel: { label: 'Stay', onClick: onCancel },
    onDismiss,
  });
  dismissFromToast(String(cancelId), 'cancel');
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onDismiss).toHaveBeenCalledWith(cancelId);

  const timedId = toast('Timed', { onAutoClose, onDismiss });
  dismissFromToast(String(timedId), 'autoClose');
  toast.dismiss(timedId);
  expect(onAutoClose).toHaveBeenCalledWith(timedId);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it('calls onDismiss for programmatic dismissal', () => {
  const onDismiss = jest.fn();
  const id = toast('Bye', { onDismiss });

  toast.dismiss(id);

  expect(onDismiss).toHaveBeenCalledWith(id);
  expect(activeToasts()).toHaveLength(0);
});

it('evicts the oldest toast beyond the visible limit', () => {
  const first = toast('One');
  toast('Two');
  toast('Three');
  toast('Four');

  expect(activeToasts().map(({ options }) => options.title)).toEqual([
    'Two',
    'Three',
    'Four',
  ]);
  expect(
    getSnapshot().toasts.find(({ options }) => options.id === String(first))
      ?.dismissing
  ).toBe(true);
});

it('resolves promise toasts', async () => {
  const id = toast.promise(Promise.resolve(42), {
    loading: 'Loading',
    success: (value) => `Loaded ${value}`,
    error: 'Failed',
  });

  expect(activeToasts()[0]?.options).toMatchObject({
    variant: 'loading',
    dismissible: false,
  });

  await settlePromises();

  expect(activeToasts()[0]?.options).toMatchObject({
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

  expect(activeToasts()[0]?.options).toMatchObject({
    variant: 'error',
    title: 'nope',
  });
});

it('increments the wiggle counter', () => {
  const id = toast('Look here');
  toast.wiggle(id);
  expect(activeToasts()[0]?.wiggle).toBe(1);
});
