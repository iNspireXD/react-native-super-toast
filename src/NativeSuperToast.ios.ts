import { configure, dismiss, dismissAll, show } from './iosToastStore';
import type { Spec } from './nativeTypes';

const IOSSuperToast: Spec = {
  show,
  dismiss,
  dismissAll,
  configure,
  triggerHaptic() {
    // SuperToastHost triggers haptics when the toast becomes visible.
  },
};

export default IOSSuperToast;
