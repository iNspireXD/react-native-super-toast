package com.supertoast

import android.app.Activity
import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.Gravity
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.view.Window
import android.view.WindowManager
import android.widget.FrameLayout
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import java.lang.ref.WeakReference
import java.util.ArrayDeque

class ToastDialogHost(private val reactContext: ReactApplicationContext) : LifecycleEventListener {
  var defaults: ToastConfig = ToastConfig()
    private set

  private val queue = ArrayDeque<ToastConfig>()
  private val mainHandler = Handler(Looper.getMainLooper())

  private var dialog: Dialog? = null
  private var current: ToastConfig? = null
  private var toastView: NativeToastView? = null

  private var autoDismissAtUptimeMs: Long = 0L
  private val autoDismiss = Runnable { dismiss(current?.id) }

  private var attachedActivityRef: WeakReference<Activity>? = null
  private var windowFocusListener: ViewTreeObserver.OnWindowFocusChangeListener? = null

  private var zOrderToken = 0
  private var lastRebumpAtUptimeMs = 0L
  private var pendingZOrderRunnable: Runnable? = null
  private var isRebumpingDialog = false

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
      present(config, animate = true, durationOverrideMs = null)
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

  private fun present(
    config: ToastConfig,
    animate: Boolean,
    durationOverrideMs: Long?,
  ) {
    val activity = reactContext.currentActivity ?: return
    if (activity.isFinishing || activity.isDestroyed) return

    val viewConfig = if (animate) config else config.copy(haptic = false)
    val toast = NativeToastView(activity, viewConfig) { dismiss(config.id) }
    val container = createContainer(activity, toast, config)
    val nextDialog = Dialog(activity, android.R.style.Theme_Translucent_NoTitleBar)

    try {
      nextDialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
      nextDialog.setCanceledOnTouchOutside(false)
      nextDialog.setCancelable(false)
      nextDialog.setContentView(container)

      nextDialog.window?.let { configureWindow(it, config, activity) }
      nextDialog.show()
      nextDialog.window?.let { configureWindow(it, config, activity) }
    } catch (error: Throwable) {
      Log.w(TAG, "Failed to show toast dialog", error)

      try {
        nextDialog.dismiss()
      } catch (_: Throwable) {
        // Ignore cleanup failure.
      }

      return
    }

    current = config
    dialog = nextDialog
    toastView = toast

    attachWindowFocusListener(activity)

    if (animate) {
      toast.animateIn()
    } else {
      toast.alpha = 1f
      toast.translationX = 0f
      toast.translationY = 0f
      toast.scaleX = 1f
      toast.scaleY = 1f
    }

    scheduleAutoDismiss(config, durationOverrideMs)
  }

  private fun createContainer(
    activity: Activity,
    toast: NativeToastView,
    config: ToastConfig,
  ): FrameLayout {
    return FrameLayout(activity).apply {
      clipChildren = false
      clipToPadding = false
      setPadding(
        dp(activity, config.horizontalMarginDp),
        0,
        dp(activity, config.horizontalMarginDp),
        0
      )

      addView(
        toast,
        FrameLayout.LayoutParams(
          if (config.widthMode == "screen") {
            ViewGroup.LayoutParams.MATCH_PARENT
          } else {
            ViewGroup.LayoutParams.WRAP_CONTENT
          },
          ViewGroup.LayoutParams.WRAP_CONTENT,
          Gravity.CENTER
        ).apply {
          if (config.widthMode != "screen") {
            toast.maxWidthPx = dp(activity, config.maxWidthDp)
          }
        }
      )
    }
  }

  private fun configureWindow(window: Window, config: ToastConfig, activity: Activity) {
    window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
    window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
    window.addFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE)
    window.addFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL)
    window.setDimAmount(0f)
    window.decorView.setPadding(0, 0, 0, 0)

    val attrs = window.attributes

    attrs.gravity = when (config.position) {
      "bottom" -> Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
      "center" -> Gravity.CENTER
      else -> Gravity.TOP or Gravity.CENTER_HORIZONTAL
    }

    attrs.width = if (config.widthMode == "screen") {
      WindowManager.LayoutParams.MATCH_PARENT
    } else {
      WindowManager.LayoutParams.WRAP_CONTENT
    }

    attrs.height = WindowManager.LayoutParams.WRAP_CONTENT

    attrs.y = when (config.position) {
      "bottom" -> dp(activity, config.bottomOffsetDp)
      "center" -> 0
      else -> dp(activity, config.topOffsetDp)
    }

    attrs.windowAnimations = 0

    window.attributes = attrs
    window.setLayout(attrs.width, attrs.height)
  }

  /**
   * RN Modal and many bottom-sheet libraries use separate application windows.
   * Android stacks a newly attached application window above older windows of
   * the same type, so a permission-free toast cannot reserve a permanent global
   * top layer. When the Activity loses focus, replace the covered toast window
   * with an identical, already-visible one.
   */
  private fun attachWindowFocusListener(activity: Activity) {
    val alreadyAttached =
      attachedActivityRef?.get() === activity && windowFocusListener != null

    if (alreadyAttached) return

    detachWindowFocusListener()

    val decorView = activity.window?.decorView ?: return
    val listener = ViewTreeObserver.OnWindowFocusChangeListener { hasFocus ->
      if (!hasFocus && current != null) {
        scheduleZOrderMaintenance()
      }
    }

    try {
      decorView.viewTreeObserver.addOnWindowFocusChangeListener(listener)
      attachedActivityRef = WeakReference(activity)
      windowFocusListener = listener
    } catch (_: Throwable) {
      attachedActivityRef = null
      windowFocusListener = null
    }
  }

  private fun detachWindowFocusListener() {
    val activity = attachedActivityRef?.get()
    val listener = windowFocusListener

    if (activity != null && listener != null) {
      try {
        val observer = activity.window?.decorView?.viewTreeObserver
        if (observer?.isAlive == true) {
          observer.removeOnWindowFocusChangeListener(listener)
        }
      } catch (_: Throwable) {
        // Ignore listener cleanup failure.
      }
    }

    attachedActivityRef = null
    windowFocusListener = null
  }

  private fun scheduleZOrderMaintenance() {
    if (current == null || isRebumpingDialog) return

    pendingZOrderRunnable?.let { mainHandler.removeCallbacks(it) }
    val token = ++zOrderToken
    val runnable = Runnable {
      pendingZOrderRunnable = null
      if (token == zOrderToken && current != null && !isRebumpingDialog) {
        rebumpToastDialogToFront()
      }
    }

    pendingZOrderRunnable = runnable
    mainHandler.postDelayed(runnable, REBUMP_DELAY_MS)
  }

  private fun cancelPendingZOrderMaintenance() {
    pendingZOrderRunnable?.let { mainHandler.removeCallbacks(it) }
    pendingZOrderRunnable = null
    zOrderToken++
  }

  private fun rebumpToastDialogToFront() {
    val config = current ?: return
    val now = SystemClock.uptimeMillis()

    if (now - lastRebumpAtUptimeMs < MIN_REBUMP_INTERVAL_MS) return

    val activity = reactContext.currentActivity ?: return
    if (activity.isFinishing || activity.isDestroyed) return

    val remainingMs = when {
      config.durationMs <= 0L -> 0L
      autoDismissAtUptimeMs <= 0L -> config.durationMs
      else -> autoDismissAtUptimeMs - now
    }

    if (config.durationMs > 0L && remainingMs <= 0L) {
      dismiss(config.id)
      return
    }

    lastRebumpAtUptimeMs = now
    isRebumpingDialog = true
    mainHandler.removeCallbacks(autoDismiss)

    val oldDialog = dialog
    val oldView = toastView
    val viewConfig = config.copy(haptic = false)
    val toast = NativeToastView(activity, viewConfig) { dismiss(config.id) }
    val container = createContainer(activity, toast, config)
    val nextDialog = Dialog(activity, android.R.style.Theme_Translucent_NoTitleBar)

    try {
      nextDialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
      nextDialog.setCanceledOnTouchOutside(false)
      nextDialog.setCancelable(false)
      nextDialog.setContentView(container)
      nextDialog.window?.let { configureWindow(it, config, activity) }
      nextDialog.show()
      nextDialog.window?.let { configureWindow(it, config, activity) }
    } catch (error: Throwable) {
      Log.w(TAG, "Failed to move toast dialog above the new window", error)
      try {
        nextDialog.dismiss()
      } catch (_: Throwable) {
        // Ignore cleanup failure.
      }

      isRebumpingDialog = false
      scheduleAutoDismiss(config, if (config.durationMs > 0L) remainingMs else 0L)
      return
    }

    current = config
    dialog = nextDialog
    toastView = toast
    attachWindowFocusListener(activity)

    // This is the same toast, not a new presentation. Keep it fully visible and
    // preserve the original timeout instead of replaying animation or haptics.
    toast.alpha = 1f
    toast.translationX = 0f
    toast.translationY = 0f
    toast.scaleX = 1f
    toast.scaleY = 1f

    scheduleAutoDismiss(
      config = config,
      durationOverrideMs = if (config.durationMs > 0L) remainingMs else 0L
    )

    // Attach the replacement first. The stale toast is already covered by the
    // modal, so removing it on the next loop does not create a blank interval.
    mainHandler.post {
      try {
        oldView?.animate()?.cancel()
        oldDialog?.dismiss()
      } catch (_: Throwable) {
        // Ignore stale window cleanup failure.
      }
    }

    mainHandler.postDelayed({
      isRebumpingDialog = false
    }, POST_REBUMP_SUPPRESSION_MS)
  }

  private fun scheduleAutoDismiss(config: ToastConfig, durationOverrideMs: Long?) {
    mainHandler.removeCallbacks(autoDismiss)

    val delayMs = durationOverrideMs ?: config.durationMs

    if (delayMs > 0L) {
      autoDismissAtUptimeMs = SystemClock.uptimeMillis() + delayMs
      mainHandler.postDelayed(autoDismiss, delayMs)
    } else {
      autoDismissAtUptimeMs = 0L
    }
  }

  private fun dismissCurrent(animated: Boolean, showNext: Boolean) {
    val view = toastView

    mainHandler.removeCallbacks(autoDismiss)
    autoDismissAtUptimeMs = 0L
    cancelPendingZOrderMaintenance()

    val finish = {
      try {
        dialog?.dismiss()
      } catch (_: Throwable) {
        // Ignore stale window cleanup failure.
      }

      dialog = null
      toastView = null
      current = null
      detachWindowFocusListener()

      if (showNext) {
        showNextIfAny()
      }
    }

    if (animated && view != null) {
      view.animateOut(finish)
    } else {
      finish()
    }
  }

  private fun showNextIfAny() {
    val next = queue.pollFirst() ?: return
    present(next, animate = true, durationOverrideMs = null)
  }

  override fun onHostResume() {
    if (current != null) {
      scheduleZOrderMaintenance()
    }
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    dismissAll()
    detachWindowFocusListener()
    mainHandler.removeCallbacksAndMessages(null)
    reactContext.removeLifecycleEventListener(this)
  }

  private fun dp(activity: Activity, value: Int): Int {
    return (value * activity.resources.displayMetrics.density).toInt()
  }

  companion object {
    private const val TAG = "SuperToast"
    private const val REBUMP_DELAY_MS = 32L
    private const val MIN_REBUMP_INTERVAL_MS = 160L
    private const val POST_REBUMP_SUPPRESSION_MS = 96L
  }
}
