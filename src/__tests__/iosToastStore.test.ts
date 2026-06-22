import { expect, it } from '@jest/globals';

import {
  completeDismiss,
  dismiss,
  dismissAll,
  getSnapshot,
  show,
  update,
} from '../iosToastStore';

it('queues, replaces, and dismisses iOS overlay toasts', () => {
  const firstId = show({ kind: 'success', message: 'First', duration: 0 });
  const secondId = show({ message: 'Second', duration: 0 });

  expect(getSnapshot().current).toMatchObject({
    id: firstId,
    backgroundColor: '#166534',
    iconColor: '#BBF7D0',
  });

  dismiss(firstId);
  expect(getSnapshot().dismissing).toBe(true);

  completeDismiss(firstId);
  expect(getSnapshot().current?.id).toBe(secondId);

  update(secondId, {
    kind: 'success',
    title: 'Updated',
    duration: 2500,
  });
  expect(getSnapshot().current).toMatchObject({
    id: secondId,
    kind: 'success',
    title: 'Updated',
    duration: 2500,
    revision: 1,
    backgroundColor: '#166534',
    iconColor: '#BBF7D0',
  });

  const replacementId = show({
    message: 'Replacement',
    duration: 0,
    queue: false,
  });
  expect(getSnapshot().current?.id).toBe(replacementId);

  dismissAll();
  completeDismiss(replacementId);
  expect(getSnapshot()).toEqual({
    current: null,
    dismissing: false,
    stacked: [],
    stackedDismissingIds: [],
  });
});

it('shows and independently dismisses stacked iOS overlay toasts', () => {
  const firstId = show({
    message: 'First stack',
    duration: 0,
    stack: true,
  });
  const secondId = show({
    message: 'Second stack',
    duration: 0,
    stack: true,
    stackLimit: 2,
  });
  const thirdId = show({
    message: 'Third stack',
    duration: 0,
    stack: true,
    stackLimit: 2,
  });

  expect(getSnapshot().stacked.map((toast) => toast.id)).toEqual([
    secondId,
    thirdId,
  ]);

  dismiss(secondId);
  expect(getSnapshot().stackedDismissingIds).toEqual([secondId]);

  completeDismiss(secondId);
  expect(getSnapshot().stacked.map((toast) => toast.id)).toEqual([thirdId]);

  dismissAll();
  expect(getSnapshot().stackedDismissingIds).toEqual([thirdId]);
  completeDismiss(thirdId);

  expect(firstId).not.toBe(secondId);
});

it('supports stacked bottom-positioned iOS overlay toasts', () => {
  const id = show({
    message: 'Bottom stack',
    duration: 0,
    position: 'bottom',
    stack: true,
  });

  expect(getSnapshot().stacked[0]).toMatchObject({
    id,
    position: 'bottom',
    stack: true,
  });

  dismiss(id);
  completeDismiss(id);
});
