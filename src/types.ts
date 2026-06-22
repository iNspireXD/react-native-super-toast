import type { ImageSourcePropType } from 'react-native';

export type ToastKind =
  | 'default'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'loading';
export type ToastPosition = 'top' | 'center' | 'bottom';
export type ToastWidthMode = 'content' | 'screen';
export type ToastAnimation = 'slide' | 'fade' | 'scale' | 'none';

export type ToastTextIcon = {
  type: 'text';
  value: string;
  size?: number;
  color?: string;
};

export type ToastFontIcon = {
  type: 'font';
  /** A single glyph character or a codepoint from an icon glyph map. */
  glyph: string | number;
  /** Example: "Material Icons", "FontAwesome", "Ionicons". The consuming app must bundle the font. */
  fontFamily: string;
  size?: number;
  color?: string;
};

export type ToastImageIcon = {
  type: 'image';
  /** require('./icon.png'), { uri }, data URI, file URI, or content URI. */
  source: ImageSourcePropType;
  size?: number;
  width?: number;
  height?: number;
  tintColor?: string;
  cornerRadius?: number;
};

export type ToastIcon = string | ToastTextIcon | ToastFontIcon | ToastImageIcon;

export type ToastOptions = {
  id?: string;
  kind?: ToastKind;
  title?: string;
  message?: string;
  icon?: ToastIcon;
  duration?: number;
  position?: ToastPosition;
  widthMode?: ToastWidthMode;
  animation?: ToastAnimation;
  /** Enter animation duration in milliseconds. */
  enterDuration?: number;
  /** Exit animation duration in milliseconds. */
  exitDuration?: number;
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
  /** Show concurrent toasts as an overlapping stack instead of a queue. */
  stack?: boolean;
  /** Maximum number of visible stacked toasts. */
  stackLimit?: number;
  /** Vertical distance in points between stacked toast layers. */
  stackOffset?: number;
};

export type ToastDefaults = Omit<
  ToastOptions,
  'id' | 'title' | 'message' | 'icon'
> & {
  icon?: ToastIcon;
};

export type ToastUpdate = Omit<ToastOptions, 'id' | 'queue'>;

export type ShowToastInput = string | ToastOptions;
