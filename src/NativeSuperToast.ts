import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

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

export type NativeBoxStyle = {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
};

export type NativeTextStyle = {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  lineHeight?: number;
};

export type NativeToastButton = {
  label: string;
  style: NativeBoxStyle;
  textStyle: NativeTextStyle;
};

/** A toast with every visual value already resolved by `resolveToast`. */
export type NativeToastOptions = {
  id: string;
  variant: string;
  title: string;
  description?: string;
  icon?: NativeToastIcon;
  iconColor: string;
  /** Milliseconds. 0 keeps the toast until it is dismissed. */
  duration: number;
  position: string;
  dismissible: boolean;
  closeButton: boolean;
  closeButtonColor: string;
  swipeDirection: string;
  haptic: boolean;
  enableStacking: boolean;
  expandOnPress: boolean;
  visibleToasts: number;
  gap: number;
  /** Distance from the safe area edge. Platform default when omitted. */
  offset?: number;
  style: NativeBoxStyle;
  titleStyle: NativeTextStyle;
  descriptionStyle: NativeTextStyle;
  action?: NativeToastButton;
  cancel?: NativeToastButton;
};

export type NativeToastEvent = {
  id: string;
  type: string;
};

export interface Spec extends TurboModule {
  show(options: NativeToastOptions): void;
  dismiss(id: string | null): void;
  wiggle(id: string): void;
  readonly onToastEvent: CodegenTypes.EventEmitter<NativeToastEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('SuperToast');
