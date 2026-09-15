import { setToasterConfig } from './resolve';
import type { ToasterProps } from './types';

/**
 * Android renders toasts in native dialog windows, so the Toaster only
 * provides configuration.
 */
export function Toaster(props: ToasterProps): null {
  setToasterConfig(props);
  return null;
}
