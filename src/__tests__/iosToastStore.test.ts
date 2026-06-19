import { expect, it } from '@jest/globals';

import {
  completeDismiss,
  dismiss,
  dismissAll,
  getSnapshot,
  show,
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

  const replacementId = show({
    message: 'Replacement',
    duration: 0,
    queue: false,
  });
  expect(getSnapshot().current?.id).toBe(replacementId);

  dismissAll();
  completeDismiss(replacementId);
  expect(getSnapshot()).toEqual({ current: null, dismissing: false });
});
