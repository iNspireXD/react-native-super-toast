import type { ImageSourcePropType, TextStyle } from 'react-native';

export type ToastId = string | number;

export type ToastVariant =
  | 'default'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'loading';

export type ToastPosition = 'top-center' | 'bottom-center' | 'center';

export type ToastTheme = 'light' | 'dark' | 'system';

export type ToastSwipeDirection = 'up' | 'left';

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

export type ToastAction = {
  label: string;
  onClick: () => void;
};

/**
 * Container style keys rendered identically on iOS and Android. Android draws
 * toasts natively, so arbitrary React Native styles are not supported.
 */
export type ToastViewStyle = {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
};

/** Text style keys rendered identically on iOS and Android. */
export type ToastTextStyle = {
  color?: string;
  fontSize?: number;
  /** Font family registered by the consuming app. */
  fontFamily?: string;
  fontWeight?: TextStyle['fontWeight'];
  lineHeight?: number;
};

export type ToastStyles = {
  toast?: ToastViewStyle;
  title?: ToastTextStyle;
  description?: ToastTextStyle;
  icon?: { color?: string };
  closeButtonIcon?: { color?: string };
};

export type ToastOptions = {
  /** Reuse an id to update a visible toast in place. */
  id?: ToastId;
  description?: string;
  icon?: ToastIcon;
  /** Milliseconds. Use `Infinity` to keep the toast until it is dismissed. */
  duration?: number;
  position?: ToastPosition;
  /** Allows swipe and close-button dismissal. Defaults to true. */
  dismissible?: boolean;
  closeButton?: boolean;
  richColors?: boolean;
  invert?: boolean;
  /** Plays a light haptic when the toast appears or updates. */
  haptic?: boolean;
  /** Pressing the action calls `onClick` and dismisses the toast. */
  action?: ToastAction;
  /** Pressing cancel calls `onClick`, then `onDismiss`, and dismisses the toast. */
  cancel?: ToastAction;
  onDismiss?: (id: ToastId) => void;
  onAutoClose?: (id: ToastId) => void;
  onPress?: () => void;
  style?: ToastViewStyle;
  styles?: ToastStyles;
  actionButtonStyle?: ToastViewStyle;
  actionButtonTextStyle?: ToastTextStyle;
  cancelButtonStyle?: ToastViewStyle;
  cancelButtonTextStyle?: ToastTextStyle;
};

export type PromiseOptions<T> = ToastOptions & {
  loading: string;
  success: string | ((result: T) => string);
  error: string | ((error: unknown) => string);
};

export type ToastHostToastOptions = {
  style?: ToastViewStyle;
  titleStyle?: ToastTextStyle;
  descriptionStyle?: ToastTextStyle;
  actionButtonStyle?: ToastViewStyle;
  actionButtonTextStyle?: ToastTextStyle;
  cancelButtonStyle?: ToastViewStyle;
  cancelButtonTextStyle?: ToastTextStyle;
} & Partial<Record<ToastVariant, ToastViewStyle>>;

export type ToastHostProps = {
  /** Defaults to 'top-center'. */
  position?: ToastPosition;
  /** Defaults to 'system'. */
  theme?: ToastTheme;
  richColors?: boolean;
  invert?: boolean;
  closeButton?: boolean;
  /** Milliseconds. Defaults to 4000. */
  duration?: number;
  /** Maximum toasts shown per position. Defaults to 3. */
  visibleToasts?: number;
  /** Space between listed toasts. Defaults to 14. */
  gap?: number;
  /** Distance from the safe area edge. */
  offset?: number;
  /** Defaults to 'up' (towards the nearest screen edge). */
  swipeToDismissDirection?: ToastSwipeDirection;
  /** Collapses concurrent toasts into an overlapping deck. */
  enableStacking?: boolean;
  haptic?: boolean;
  icons?: Partial<Record<Exclude<ToastVariant, 'default'>, ToastIcon>>;
  toastOptions?: ToastHostToastOptions;
};
