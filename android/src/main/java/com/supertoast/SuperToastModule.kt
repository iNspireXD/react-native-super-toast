package com.supertoast

import android.view.HapticFeedbackConstants
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil

class SuperToastModule(private val reactContext: ReactApplicationContext) : NativeSuperToastSpec(reactContext) {
  private val host = ToastDialogHost(reactContext)

  override fun getName(): String = NAME

  override fun show(options: ReadableMap): String {
    val config = ToastConfig.from(options, host.defaults)
    UiThreadUtil.runOnUiThread { host.show(config) }
    return config.id
  }

  override fun update(id: String, options: ReadableMap) {
    UiThreadUtil.runOnUiThread { host.update(id, options) }
  }

  override fun dismiss(id: String?) {
    UiThreadUtil.runOnUiThread { host.dismiss(id) }
  }

  override fun dismissAll() {
    UiThreadUtil.runOnUiThread { host.dismissAll() }
  }

  override fun configure(defaults: ReadableMap) {
    UiThreadUtil.runOnUiThread { host.configure(defaults) }
  }

  override fun triggerHaptic() {
    UiThreadUtil.runOnUiThread {
      reactContext.currentActivity?.window?.decorView?.performHapticFeedback(
        HapticFeedbackConstants.KEYBOARD_TAP
      )
    }
  }

  companion object {
    const val NAME = "SuperToast"
  }
}
