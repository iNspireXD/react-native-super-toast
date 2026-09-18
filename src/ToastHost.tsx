import { setToastHostConfig } from './resolve';
import type { ToastHostProps } from './types';

/**
 * Toasts render natively in their own windows (dialogs on Android, an overlay
 * UIWindow on iOS), so the ToastHost only provides configuration.
 */
export function ToastHost(props: ToastHostProps): null {
  setToastHostConfig(props);
  return null;
}
