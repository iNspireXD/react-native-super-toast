import type { TurboModule } from 'react-native';

export type NativeToastIcon = {
  type?: string;
  value?: string;
  glyph?: string;
  fontFamily?: string;
  uri?: string;
  width?: number;
  height?: number;
  size?: number;
  scale?: number;
  color?: string;
  tintColor?: string;
  cornerRadius?: number;
};

export type NativeToastOptions = {
  id?: string;
  kind?: string;
  title?: string;
  message?: string;
  icon?: NativeToastIcon;
  duration?: number;
  position?: string;
  widthMode?: string;
  animation?: string;
  topOffset?: number;
  bottomOffset?: number;
  maxWidth?: number;
  horizontalMargin?: number;
  backgroundColor?: string;
  titleColor?: string;
  messageColor?: string;
  iconColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  gap?: number;
  titleSize?: number;
  messageSize?: number;
  elevation?: number;
  shadowOpacity?: number;
  swipeToDismiss?: boolean;
  closeOnPress?: boolean;
  haptic?: boolean;
  queue?: boolean;
  stack?: boolean;
  stackLimit?: number;
  stackOffset?: number;
};

export interface Spec extends TurboModule {
  show(options: NativeToastOptions): string;
  update(id: string, options: NativeToastOptions): void;
  dismiss(id: string | null): void;
  dismissAll(): void;
  configure(defaults: NativeToastOptions): void;
  triggerHaptic(): void;
}
