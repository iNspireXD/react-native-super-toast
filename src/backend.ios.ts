import type { ToastBackend } from './backendTypes';
import { addEventListener, dismiss, show, wiggle } from './iosToastStore';

export const backend: ToastBackend = {
  show,
  dismiss,
  wiggle,
  addListener: addEventListener,
};
