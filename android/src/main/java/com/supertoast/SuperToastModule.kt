package com.supertoast

import android.view.HapticFeedbackConstants
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil

class SuperToastModule(private val reactContext: ReactApplicationContext) : NativeSuperToastSpec(reactContext) {
  private val host = ToastDialogHost(reactContext, ::emitEvent)

  override fun getName(): String = NAME

  override fun show(options: ReadableMap) {
    val config = ToastConfig.from(options) ?: return
    UiThreadUtil.runOnUiThread { host.show(config) }
  }

  override fun dismiss(id: String?) {
    UiThreadUtil.runOnUiThread { host.dismiss(id) }
  }

  override fun wiggle(id: String) {
    UiThreadUtil.runOnUiThread { host.wiggle(id) }
  }

  override fun triggerHaptic() {
    UiThreadUtil.runOnUiThread {
      reactContext.currentActivity?.window?.decorView?.performHapticFeedback(
        HapticFeedbackConstants.KEYBOARD_TAP
      )
    }
  }

  private fun emitEvent(id: String, type: String) {
    if (!reactContext.hasActiveReactInstance()) return

    val payload = Arguments.createMap().apply {
      putString("id", id)
      putString("type", type)
    }
    reactContext.emitDeviceEvent(EVENT_NAME, payload)
  }

  companion object {
    const val NAME = "SuperToast"
    private const val EVENT_NAME = "SuperToastEvent"
  }
}
