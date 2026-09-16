import { setToastHostConfig } from './resolve';
import type { ToastHostProps } from './types';

/**
 * Android renders toasts in native dialog windows, so the ToastHost only
 * provides configuration.
 */
export function ToastHost(props: ToastHostProps): null {
  setToastHostConfig(props);
  return null;
}
