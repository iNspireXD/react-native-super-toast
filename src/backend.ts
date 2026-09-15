import { DeviceEventEmitter, processColor } from 'react-native';

import NativeSuperToast from './NativeSuperToast';
import type {
  NativeBoxStyle,
  NativeTextStyle,
  NativeToastButton,
  NativeToastOptions,
} from './NativeSuperToast';
import type { ToastBackend, ToastEvent } from './backendTypes';

const EVENT_NAME = 'SuperToastEvent';

/** Converts any React Native color string to Android's `#AARRGGBB`. */
function androidColor(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const processed = processColor(value);
  if (typeof processed !== 'number') return undefined;
  const unsigned = processed < 0 ? processed + 2 ** 32 : processed;
  return `#${unsigned.toString(16).padStart(8, '0')}`;
}

const box = (style: NativeBoxStyle): NativeBoxStyle => ({
  ...style,
  backgroundColor: androidColor(style.backgroundColor),
  borderColor: androidColor(style.borderColor),
});

const text = (style: NativeTextStyle): NativeTextStyle => ({
  ...style,
  color: androidColor(style.color),
});

const button = (value?: NativeToastButton): NativeToastButton | undefined =>
  value && {
    ...value,
    style: box(value.style),
    textStyle: text(value.textStyle),
  };

function toAndroid(options: NativeToastOptions): NativeToastOptions {
  return {
    ...options,
    icon: options.icon && {
      ...options.icon,
      color: androidColor(options.icon.color),
      tintColor: androidColor(options.icon.tintColor),
    },
    iconColor: androidColor(options.iconColor) ?? options.iconColor,
    closeButtonColor:
      androidColor(options.closeButtonColor) ?? options.closeButtonColor,
    style: box(options.style),
    titleStyle: text(options.titleStyle),
    descriptionStyle: text(options.descriptionStyle),
    action: button(options.action),
    cancel: button(options.cancel),
  };
}

export const backend: ToastBackend = {
  show: (options) => NativeSuperToast.show(toAndroid(options)),
  dismiss: (id) => NativeSuperToast.dismiss(id),
  wiggle: (id) => NativeSuperToast.wiggle(id),
  addListener(listener) {
    const subscription = DeviceEventEmitter.addListener(
      EVENT_NAME,
      (event: ToastEvent) => listener(event)
    );
    return () => subscription.remove();
  },
};
