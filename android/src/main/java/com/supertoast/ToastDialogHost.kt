package com.supertoast

import android.app.Activity
import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.view.Gravity
import android.view.ViewGroup
import android.view.Window
import android.view.WindowManager
import android.widget.FrameLayout
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import java.util.ArrayDeque

class ToastDialogHost(private val reactContext: ReactApplicationContext) : LifecycleEventListener {
  var defaults: ToastConfig = ToastConfig()
    private set

  private val queue = ArrayDeque<ToastConfig>()
  private var dialog: Dialog? = null
  private var current: ToastConfig? = null
  private var toastView: NativeToastView? = null
  private val autoDismiss = Runnable { dismiss(current?.id) }

  init {
    reactContext.addLifecycleEventListener(this)
  }

  fun configure(map: ReadableMap) {
    defaults = ToastConfig.from(map, defaults)
  }

  fun show(config: ToastConfig) {
    if (!config.queue) {
      queue.clear()
      dismissCurrent(animated = false, showNext = false)
    }

    if (current == null) {
      present(config)
    } else {
      queue.add(config)
    }
  }

  fun dismiss(id: String?) {
    val showing = current
    when {
      id == null -> dismissCurrent(animated = true, showNext = true)
      showing?.id == id -> dismissCurrent(animated = true, showNext = true)
      else -> queue.removeAll { it.id == id }
    }
  }

  fun dismissAll() {
    queue.clear()
    dismissCurrent(animated = true, showNext = false)
  }

  private fun present(config: ToastConfig) {
    val activity = reactContext.currentActivity ?: return
    if (activity.isFinishing || activity.isDestroyed) return

    current = config
    val toast = NativeToastView(activity, config) { dismiss(config.id) }
    toastView = toast

    val container = FrameLayout(activity).apply {
      clipChildren = false
      clipToPadding = false
      setPadding(
        dp(activity, config.horizontalMarginDp),
        0,
        dp(activity, config.horizontalMarginDp),
        0
      )
      addView(
        toast, FrameLayout.LayoutParams(
          if (config.widthMode == "screen") ViewGroup.LayoutParams.MATCH_PARENT else ViewGroup.LayoutParams.WRAP_CONTENT,
          ViewGroup.LayoutParams.WRAP_CONTENT,
          Gravity.CENTER
        ).apply {
          if (config.widthMode != "screen") {
            val maxWidth = dp(activity, config.maxWidthDp)
            toast.maxWidthPx = maxWidth
          }
        })
    }

    dialog = Dialog(activity, android.R.style.Theme_Translucent_NoTitleBar).apply {
      requestWindowFeature(Window.FEATURE_NO_TITLE)
      setCanceledOnTouchOutside(false)
      setCancelable(false)
      setContentView(container)
      show()
      window?.let { configureWindow(it, config, activity) }
    }

    toast.animateIn()

    if (config.durationMs > 0) {
      toast.removeCallbacks(autoDismiss)
      toast.postDelayed(autoDismiss, config.durationMs)
    }
  }

  private fun configureWindow(window: Window, config: ToastConfig, activity: Activity) {
    window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
    window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
    window.addFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE)
    window.addFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL)
    window.decorView.setPadding(0, 0, 0, 0)

    val attrs = window.attributes
    attrs.gravity = when (config.position) {
      "bottom" -> Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
      "center" -> Gravity.CENTER
      else -> Gravity.TOP or Gravity.CENTER_HORIZONTAL
    }
    attrs.width =
      if (config.widthMode == "screen") WindowManager.LayoutParams.MATCH_PARENT else WindowManager.LayoutParams.WRAP_CONTENT
    attrs.height = WindowManager.LayoutParams.WRAP_CONTENT
    attrs.y = when (config.position) {
      "bottom" -> dp(activity, config.bottomOffsetDp)
      "center" -> 0
      else -> dp(activity, config.topOffsetDp)
    }
    window.attributes = attrs
    window.setLayout(attrs.width, attrs.height)
  }

  private fun dismissCurrent(animated: Boolean, showNext: Boolean) {
    val view = toastView
    view?.removeCallbacks(autoDismiss)

    val finish = {
      dialog?.dismiss()
      dialog = null
      toastView = null
      current = null
      if (showNext) showNextIfAny()
    }

    if (animated && view != null) {
      view.animateOut(finish)
    } else {
      finish()
    }
  }

  private fun showNextIfAny() {
    val next = queue.pollFirst() ?: return
    present(next)
  }

  override fun onHostResume() = Unit

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    dismissAll()
    reactContext.removeLifecycleEventListener(this)
  }

  private fun dp(activity: Activity, value: Int): Int = (value * activity.resources.displayMetrics.density).toInt()
  private fun dp(context: android.content.Context, value: Int): Int =
    (value * context.resources.displayMetrics.density).toInt()
}
