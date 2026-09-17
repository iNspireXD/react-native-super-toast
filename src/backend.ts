import { processColor } from 'react-native';

import NativeSuperToast from './NativeSuperToast';
import type {
  NativeBoxStyle,
  NativeTextStyle,
  NativeToastButton,
  NativeToastOptions,
} from './NativeSuperToast';
import type { ToastBackend, ToastEvent } from './backendTypes';

/** Converts any React Native color string to `#AARRGGBB` for native parsing. */
function nativeColor(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const processed = processColor(value);
  if (typeof processed !== 'number') return undefined;
  const unsigned = processed < 0 ? processed + 2 ** 32 : processed;
  return `#${unsigned.toString(16).padStart(8, '0')}`;
}

const box = (style: NativeBoxStyle): NativeBoxStyle => ({
  ...style,
  backgroundColor: nativeColor(style.backgroundColor),
  borderColor: nativeColor(style.borderColor),
});

const text = (style: NativeTextStyle): NativeTextStyle => ({
  ...style,
  color: nativeColor(style.color),
});

const button = (value?: NativeToastButton): NativeToastButton | undefined =>
  value && {
    ...value,
    style: box(value.style),
    textStyle: text(value.textStyle),
  };

function toNative(options: NativeToastOptions): NativeToastOptions {
  return {
    ...options,
    icon: options.icon && {
      ...options.icon,
      color: nativeColor(options.icon.color),
      tintColor: nativeColor(options.icon.tintColor),
    },
    iconColor: nativeColor(options.iconColor) ?? options.iconColor,
    closeButtonColor:
      nativeColor(options.closeButtonColor) ?? options.closeButtonColor,
    style: box(options.style),
    titleStyle: text(options.titleStyle),
    descriptionStyle: text(options.descriptionStyle),
    action: button(options.action),
    cancel: button(options.cancel),
  };
}

export const backend: ToastBackend = {
  show: (options) => NativeSuperToast.show(toNative(options)),
  dismiss: (id) => NativeSuperToast.dismiss(id),
  wiggle: (id) => NativeSuperToast.wiggle(id),
  addListener(listener) {
    const subscription = NativeSuperToast.onToastEvent((event) =>
      listener(event as ToastEvent)
    );
    return () => subscription.remove();
  },
};
