import { afterEach, expect, it } from '@jest/globals';

import { resolveToast, setToastHostConfig } from '../resolve';
import type { ToastPosition } from '../types';

afterEach(() => setToastHostConfig({}));

it('uses the light palette by default', () => {
  const resolved = resolveToast('1', 'Hello', 'default', {});

  expect(resolved).toMatchObject({
    style: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      borderWidth: 0,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    titleStyle: { color: '#232020', fontWeight: '600', fontSize: 14 },
    iconColor: '#232020',
    swipeDirection: 'up',
    visibleToasts: 3,
    gap: 14,
  });
  expect(resolved.action).toBeUndefined();
});

it('resolves the offset for the edge each toast is anchored to', () => {
  const offsetFor = (position: ToastPosition) =>
    resolveToast('1', 'Hi', 'default', { position }).offset;

  expect(offsetFor('top-center')).toBeUndefined();

  setToastHostConfig({ offset: 24 });
  expect(offsetFor('top-center')).toBe(24);
  expect(offsetFor('bottom-center')).toBe(24);
  expect(offsetFor('center')).toBeUndefined();

  setToastHostConfig({ offset: { top: 8, bottom: 80 } });
  expect(offsetFor('top-center')).toBe(8);
  expect(offsetFor('bottom-center')).toBe(80);

  setToastHostConfig({ offset: { bottom: 80 } });
  expect(offsetFor('top-center')).toBeUndefined();
  expect(offsetFor('bottom-center')).toBe(80);
});

it('applies theme, rich colors, and host settings', () => {
  setToastHostConfig({
    theme: 'dark',
    richColors: true,
    closeButton: true,
    duration: 1500,
    position: 'bottom-center',
    swipeToDismissDirection: 'right',
    enableStacking: true,
    expandOnPress: true,
  });

  expect(resolveToast('1', 'Oops', 'error', {})).toMatchObject({
    style: {
      backgroundColor: '#2d0607',
      borderColor: '#4d0408',
      borderWidth: 1,
    },
    titleStyle: { color: '#ff9ea1' },
    iconColor: '#ff9ea1',
    closeButton: true,
    duration: 1500,
    position: 'bottom-center',
    swipeDirection: 'right',
    enableStacking: true,
    expandOnPress: true,
  });

  expect(
    resolveToast('2', 'Inverted', 'default', { invert: true }).style
      .backgroundColor
  ).toBe('#ffffff');
});

it('merges styles from the host, variant, and toast in order', () => {
  setToastHostConfig({
    toastOptions: {
      style: { padding: 10, borderRadius: 8 },
      success: { backgroundColor: '#00ff00' },
      titleStyle: { fontFamily: 'Inter', fontWeight: 'bold' },
    },
  });

  const resolved = resolveToast('1', 'Styled', 'success', {
    style: { paddingHorizontal: 20 },
    styles: { title: { color: 'red' }, icon: { color: 'blue' } },
    action: { label: 'Open', onClick: () => {} },
    actionButtonTextStyle: { fontSize: 12 },
    duration: Infinity,
  });

  expect(resolved).toMatchObject({
    style: {
      backgroundColor: '#00ff00',
      borderRadius: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    titleStyle: { color: 'red', fontFamily: 'Inter', fontWeight: '700' },
    iconColor: 'blue',
    duration: 0,
    action: {
      label: 'Open',
      style: { borderRadius: 999, borderWidth: 1 },
      textStyle: { fontSize: 12, fontWeight: '600' },
    },
  });
});
