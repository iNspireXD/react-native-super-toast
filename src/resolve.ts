import { Appearance, Image } from 'react-native';

import type {
  NativeBoxStyle,
  NativeTextStyle,
  NativeToastButton,
  NativeToastIcon,
  NativeToastOptions,
} from './NativeSuperToast';
import { palettes } from './theme';
import type {
  ToastAction,
  ToastFontIcon,
  ToastIcon,
  ToastOptions,
  ToastTextStyle,
  ToastVariant,
  ToastViewStyle,
  ToastHostProps,
} from './types';

export const toastDefaults = {
  duration: 4000,
  position: 'top-center',
  visibleToasts: 3,
  gap: 14,
  swipeToDismissDirection: 'up',
  theme: 'system',
} as const;

let toastHostConfig: ToastHostProps = {};

export function setToastHostConfig(config: ToastHostProps): void {
  toastHostConfig = config;
}

export function fontIcon(options: Omit<ToastFontIcon, 'type'>): ToastFontIcon {
  return { type: 'font', ...options };
}

function assignDefined<T extends object>(target: T, source: Partial<T>): T {
  for (const key of Object.keys(source) as Array<keyof T>) {
    if (source[key] !== undefined) {
      target[key] = source[key] as T[keyof T];
    }
  }
  return target;
}

function mergeBox(
  ...layers: Array<ToastViewStyle | undefined>
): NativeBoxStyle {
  const result: NativeBoxStyle = {};
  for (const layer of layers) {
    if (!layer) continue;
    const { padding, ...rest } = layer;
    if (padding !== undefined) {
      result.paddingHorizontal = padding;
      result.paddingVertical = padding;
    }
    assignDefined(result, rest);
  }
  return result;
}

function mergeText(
  ...layers: Array<ToastTextStyle | undefined>
): NativeTextStyle {
  const result: NativeTextStyle = {};
  for (const layer of layers) {
    if (!layer) continue;
    const { fontWeight, ...rest } = layer;
    if (fontWeight !== undefined) {
      result.fontWeight =
        fontWeight === 'bold'
          ? '700'
          : fontWeight === 'normal'
            ? '400'
            : String(fontWeight);
    }
    assignDefined(result, rest);
  }
  return result;
}

function glyphToString(glyph: string | number): string {
  return typeof glyph === 'number' ? String.fromCodePoint(glyph) : glyph;
}

export function normalizeIcon(
  icon: ToastIcon | undefined
): NativeToastIcon | undefined {
  if (!icon) return undefined;

  if (typeof icon === 'string') {
    return { type: 'text', value: icon };
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
    const resolved = Image.resolveAssetSource(icon.source);
    if (!resolved?.uri) return undefined;

    const size = icon.size ?? 20;
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

function resolveScheme(invert: boolean): 'light' | 'dark' {
  const theme = toastHostConfig.theme ?? toastDefaults.theme;
  const scheme =
    theme === 'system'
      ? Appearance.getColorScheme() === 'dark'
        ? 'dark'
        : 'light'
      : theme;
  if (!invert) return scheme;
  return scheme === 'dark' ? 'light' : 'dark';
}

function resolveDuration(variant: ToastVariant, duration?: number): number {
  const value =
    duration ??
    (variant === 'loading'
      ? Infinity
      : (toastHostConfig.duration ?? toastDefaults.duration));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function resolveToast(
  id: string,
  title: string,
  variant: ToastVariant,
  options: ToastOptions
): NativeToastOptions {
  const config = toastHostConfig;
  const toastOptions = config.toastOptions ?? {};
  const colors =
    palettes[resolveScheme(options.invert ?? config.invert ?? false)];
  const tone = variant === 'loading' ? 'info' : variant;
  const rich =
    (options.richColors ?? config.richColors ?? false) && tone !== 'default'
      ? colors.rich[tone]
      : undefined;

  const iconColor =
    options.styles?.icon?.color ??
    rich?.foreground ??
    (variant === 'loading'
      ? colors.textSecondary
      : tone === 'default'
        ? colors.textPrimary
        : colors[tone]);

  const button = (
    action: ToastAction | undefined,
    base: { style: ToastViewStyle; textStyle: ToastTextStyle },
    style: Array<ToastViewStyle | undefined>,
    textStyle: Array<ToastTextStyle | undefined>
  ): NativeToastButton | undefined =>
    action
      ? {
          label: action.label,
          style: mergeBox(base.style, ...style),
          textStyle: mergeText(base.textStyle, ...textStyle),
        }
      : undefined;

  return {
    id,
    variant,
    title,
    description: options.description || undefined,
    icon: normalizeIcon(options.icon ?? config.icons?.[variant as 'success']),
    iconColor,
    duration: resolveDuration(variant, options.duration),
    position: options.position ?? config.position ?? toastDefaults.position,
    dismissible: options.dismissible ?? true,
    closeButton: options.closeButton ?? config.closeButton ?? false,
    closeButtonColor:
      options.styles?.closeButtonIcon?.color ??
      rich?.foreground ??
      colors.textSecondary,
    swipeDirection:
      config.swipeToDismissDirection ?? toastDefaults.swipeToDismissDirection,
    haptic: options.haptic ?? config.haptic ?? false,
    enableStacking: config.enableStacking ?? false,
    visibleToasts: Math.max(
      1,
      config.visibleToasts ?? toastDefaults.visibleToasts
    ),
    gap: config.gap ?? toastDefaults.gap,
    offset: config.offset,
    style: mergeBox(
      {
        backgroundColor: rich?.background ?? colors.backgroundPrimary,
        borderColor: rich?.border ?? 'transparent',
        borderWidth: rich ? 1 : 0,
        borderRadius: 16,
        padding: 16,
      },
      toastOptions.style,
      toastOptions[variant],
      options.style,
      options.styles?.toast
    ),
    titleStyle: mergeText(
      {
        color: rich?.foreground ?? colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
      },
      toastOptions.titleStyle,
      options.styles?.title
    ),
    descriptionStyle: mergeText(
      {
        color: rich?.foreground ?? colors.textTertiary,
        fontSize: 14,
        lineHeight: 20,
      },
      toastOptions.descriptionStyle,
      options.styles?.description
    ),
    action: button(
      options.action,
      {
        style: {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.borderSecondary,
          borderWidth: 1,
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 6,
        },
        textStyle: {
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: '600',
          lineHeight: 20,
        },
      },
      [toastOptions.actionButtonStyle, options.actionButtonStyle],
      [toastOptions.actionButtonTextStyle, options.actionButtonTextStyle]
    ),
    cancel: button(
      options.cancel,
      {
        style: { paddingVertical: 6 },
        textStyle: {
          color: colors.textSecondary,
          fontSize: 14,
          fontWeight: '600',
          lineHeight: 20,
        },
      },
      [toastOptions.cancelButtonStyle, options.cancelButtonStyle],
      [toastOptions.cancelButtonTextStyle, options.cancelButtonTextStyle]
    ),
  };
}
