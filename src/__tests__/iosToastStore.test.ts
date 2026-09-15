import { expect, it, jest } from '@jest/globals';

import {
  addEventListener,
  completeRemove,
  dismiss,
  dismissFromToast,
  getSnapshot,
  show,
} from '../iosToastStore';
import { resolveToast } from '../resolve';

const options = (id: string, position = 'top-center') => ({
  ...resolveToast(id, `Toast ${id}`, 'default', {}),
  position,
});

it('replaces an exiting toast that is shown again with the same id', () => {
  const events = jest.fn();
  const unsubscribe = addEventListener(events);

  show(options('a'));
  const [first] = getSnapshot().toasts;
  dismiss('a');
  show(options('a'));

  const toasts = getSnapshot().toasts;
  expect(toasts).toHaveLength(1);
  expect(toasts[0]?.dismissing).toBe(false);
  expect(toasts[0]?.key).not.toBe(first?.key);

  // The replaced card finishing its exit must not remove the new toast.
  completeRemove(first!.key);
  expect(getSnapshot().toasts).toHaveLength(1);
  expect(events).not.toHaveBeenCalled();

  dismiss(null);
  completeRemove(getSnapshot().toasts[0]!.key);
  expect(events).toHaveBeenCalledWith({ id: 'a', type: 'removed' });
  unsubscribe();
});

it('emits toast-originated events only for active toasts', () => {
  const events = jest.fn();
  const unsubscribe = addEventListener(events);

  show(options('b'));
  dismissFromToast('b', 'dismiss');
  dismissFromToast('b', 'autoClose');

  expect(events).toHaveBeenCalledTimes(1);
  expect(events).toHaveBeenCalledWith({ id: 'b', type: 'dismiss' });

  completeRemove(getSnapshot().toasts[0]!.key);
  unsubscribe();
});

it('limits visible toasts per position', () => {
  ['1', '2', '3', '4'].forEach((id) => show(options(id)));
  show(options('bottom', 'bottom-center'));

  const active = getSnapshot().toasts.filter(({ dismissing }) => !dismissing);
  expect(active.map(({ options: { id } }) => id)).toEqual([
    '2',
    '3',
    '4',
    'bottom',
  ]);
});
