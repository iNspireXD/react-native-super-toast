import { Image } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import NativeSuperToast from './NativeSuperToast';
import SuperToastHost from './SuperToastHost';
import type { NativeToastIcon, NativeToastOptions } from './nativeTypes';
import type {
  ShowToastInput,
  ToastDefaults,
  ToastFontIcon,
  ToastIcon,
  ToastKind,
  ToastOptions,
} from './types';
export { SuperToastHost };

export type {
  ShowToastInput,
  ToastAnimation,
  ToastDefaults,
  ToastFontIcon,
  ToastIcon,
  ToastImageIcon,
  ToastKind,
  ToastOptions,
  ToastPosition,
  ToastTextIcon,
  ToastWidthMode,
} from './types';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function glyphToString(glyph: string | number): string {
  if (typeof glyph === 'number') {
    return String.fromCodePoint(glyph);
  }
  return glyph;
}

export function fontIcon(options: Omit<ToastFontIcon, 'type'>): ToastFontIcon {
  return { type: 'font', ...options };
}

function normalizeIcon(
  icon: ToastIcon | undefined
): NativeToastIcon | undefined {
  if (!icon) return undefined;

  if (typeof icon === 'string') {
    return {
      type: 'text',
      value: icon,
    };
  }

  if (icon.type === 'text') {
    return {
      type: 'text',
      value: icon.value,
      size: icon.size,
      color: icon.color,
    };
  }

  if (icon.type === 'font') {
    return {
      type: 'font',
      glyph: glyphToString(icon.glyph),
      fontFamily: icon.fontFamily,
      size: icon.size,
      color: icon.color,
    };
  }

  if (icon.type === 'image') {
    const resolved = Image.resolveAssetSource(
      icon.source as ImageSourcePropType
    );
    const size = icon.size ?? 24;

    if (!resolved?.uri) {
      return undefined;
    }

    return {
      type: 'image',
      uri: resolved.uri,
      width: icon.width ?? icon.size ?? resolved.width ?? size,
      height: icon.height ?? icon.size ?? resolved.height ?? size,
      size,
      scale: resolved.scale ?? 1,
      tintColor: icon.tintColor,
      cornerRadius: icon.cornerRadius,
    };
  }

  return undefined;
}

function normalize(
  input: ShowToastInput,
  extra?: ToastOptions
): NativeToastOptions {
  const base = typeof input === 'string' ? { message: input } : input;
  const merged: ToastOptions = { ...base, ...extra };

  return {
    ...merged,
    icon: normalizeIcon(merged.icon),
  };
}

function withKind(kind: ToastKind) {
  return (input: ShowToastInput, extra?: ToastOptions) =>
    NativeSuperToast.show({ ...normalize(input, extra), kind });
}

export const SuperToast = {
  show(input: ShowToastInput, extra?: ToastOptions): string {
    return NativeSuperToast.show(normalize(input, extra));
  },

  success: withKind('success'),
  error: withKind('error'),
  warning: withKind('warning'),
  info: withKind('info'),
  loading: withKind('loading'),

  dismiss(id?: string): void {
    NativeSuperToast.dismiss(id ?? null);
  },

  dismissAll(): void {
    NativeSuperToast.dismissAll();
  },

  configure(defaults: ToastDefaults): void {
    if (!isObject(defaults)) return;
    NativeSuperToast.configure({
      ...defaults,
      icon: normalizeIcon(defaults.icon),
    });
  },
};

export function showToast(input: ShowToastInput, extra?: ToastOptions) {
  return SuperToast.show(input, extra);
}

export default SuperToast;
