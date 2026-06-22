package com.supertoast

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
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
import android.view.animation.AccelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import java.lang.ref.WeakReference
import java.util.ArrayDeque

class ToastDialogHost(private val reactContext: ReactApplicationContext) : LifecycleEventListener {
  private data class StackedEntry(
    var config: ToastConfig,
    var dialog: Dialog,
    var view: NativeToastView,
    var dismissRunnable: Runnable? = null,
    var dismissAtUptimeMs: Long = 0L,
  )

  private data class StackedReplacement(
    val entry: StackedEntry,
    val oldDialog: Dialog,
    val oldView: NativeToastView,
    val newDialog: Dialog,
    val newView: NativeToastView,
    val remainingMs: Long,
  )

  var defaults: ToastConfig = ToastConfig()
    private set

  private val queue = ArrayDeque<ToastConfig>()
  private val mainHandler = Handler(Looper.getMainLooper())

  private var dialog: Dialog? = null
  private var current: ToastConfig? = null
  private var toastView: NativeToastView? = null
  private var windowSlideAnimator: ValueAnimator? = null
  private val stackedEntries = mutableListOf<StackedEntry>()
  private val stackedWindowAnimators = mutableMapOf<String, ValueAnimator>()

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
    if (config.stack && config.position == "top") {
      showStacked(config)
      return
    }

    dismissAllStacked(animated = false)

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

  fun update(id: String, options: ReadableMap) {
    val stacked = stackedEntries.firstOrNull { it.config.id == id }
    if (stacked != null) {
      updateStacked(stacked, ToastConfig.update(options, stacked.config))
      return
    }

    val showing = current

    if (showing?.id == id) {
      replaceCurrent(ToastConfig.update(options, showing))
      return
    }

    val pending = queue.toList()
    queue.clear()
    pending.forEach { config ->
      queue.add(
        if (config.id == id) ToastConfig.update(options, config) else config
      )
    }
  }

  fun dismiss(id: String?) {
    val stackedId = id ?: stackedEntries.lastOrNull()?.config?.id
    if (stackedId != null && stackedEntries.any { it.config.id == stackedId }) {
      dismissStacked(stackedId, animated = true)
      return
    }

    val showing = current

    when {
      id == null -> dismissCurrent(animated = true, showNext = true)
      showing?.id == id -> dismissCurrent(animated = true, showNext = true)
      else -> queue.removeAll { it.id == id }
    }
  }

  fun dismissAll() {
    queue.clear()
    if (stackedEntries.isNotEmpty()) {
      dismissAllStacked(animated = true)
      return
    }
    dismissCurrent(animated = true, showNext = false)
  }

  private fun showStacked(config: ToastConfig) {
    val activity = reactContext.currentActivity ?: return
    if (activity.isFinishing || activity.isDestroyed) return

    queue.clear()
    if (current != null) {
      dismissCurrent(animated = false, showNext = false)
    }

    val toast = NativeToastView(activity, config) { dismiss(config.id) }
    val container = createContainer(activity, toast, config)
    val nextDialog = Dialog(activity, android.R.style.Theme_Translucent_NoTitleBar)

    try {
      nextDialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
      nextDialog.setCanceledOnTouchOutside(false)
      nextDialog.setCancelable(false)
      nextDialog.setContentView(container)
      nextDialog.window?.let {
        configureWindow(it, config, activity, hideTopSlide = true)
      }
      nextDialog.show()
      nextDialog.window?.let {
        configureWindow(it, config, activity, hideTopSlide = true)
      }
    } catch (error: Throwable) {
      Log.w(TAG, "Failed to show stacked toast dialog", error)
      try {
        nextDialog.dismiss()
      } catch (_: Throwable) {
        // Ignore cleanup failure.
      }
      return
    }

    val entry = StackedEntry(config, nextDialog, toast)
    stackedEntries.add(entry)

    while (stackedEntries.size > config.stackLimit) {
      removeStackedEntry(stackedEntries.first())
    }

    attachWindowFocusListener(activity)
    toast.alpha = 1f
    toast.post {
      if (stackedEntries.contains(entry)) {
        updateStackLayout(activity, enteringId = config.id)
      }
    }
    scheduleStackAutoDismiss(entry)

    if (activity.window?.decorView?.hasWindowFocus() == false) {
      scheduleZOrderMaintenance()
    }
  }

  private fun updateStacked(entry: StackedEntry, config: ToastConfig) {
    val activity = reactContext.currentActivity ?: return
    if (activity.isFinishing || activity.isDestroyed) return

    val toast = NativeToastView(activity, config) { dismiss(config.id) }
    val container = createContainer(activity, toast, config)

    try {
      entry.dialog.setContentView(container)
      entry.dialog.window?.let { configureWindow(it, config, activity) }
    } catch (error: Throwable) {
      Log.w(TAG, "Failed to update stacked toast", error)
      return
    }

    entry.config = config
    entry.view = toast
    toast.alpha = 1f
    scheduleStackAutoDismiss(entry)
    updateStackLayout(activity)
  }

  private fun scheduleStackAutoDismiss(
    entry: StackedEntry,
    durationOverrideMs: Long? = null,
  ) {
    entry.dismissRunnable?.let { mainHandler.removeCallbacks(it) }
    entry.dismissRunnable = null

    val delayMs = durationOverrideMs ?: entry.config.durationMs
    if (delayMs <= 0L) {
      entry.dismissAtUptimeMs = 0L
      return
    }

    val runnable = Runnable { dismissStacked(entry.config.id, animated = true) }
    entry.dismissRunnable = runnable
    entry.dismissAtUptimeMs = SystemClock.uptimeMillis() + delayMs
    mainHandler.postDelayed(runnable, delayMs)
  }

  private fun updateStackLayout(activity: Activity, enteringId: String? = null) {
    val lastIndex = stackedEntries.lastIndex

    stackedEntries.forEachIndexed { index, entry ->
      val depth = lastIndex - index
      val targetY =
        dp(activity, entry.config.topOffsetDp + depth * entry.config.stackOffsetDp)
      val targetScale = (1f - depth * 0.035f).coerceAtLeast(0.9f)
      val targetAlpha = (1f - depth * 0.2f).coerceAtLeast(0.55f)

      entry.view.animate()
        .scaleX(targetScale)
        .scaleY(targetScale)
        .alpha(targetAlpha)
        .setDuration(180L)
        .setInterpolator(DecelerateInterpolator())
        .start()

      val window = entry.dialog.window ?: return@forEachIndexed
      val startY = if (entry.config.id == enteringId) {
        -(statusBarHeight(activity) + entry.view.height + dp(activity, 8))
      } else {
        window.attributes.y
      }
      animateStackWindow(entry.config.id, window, startY, targetY)
    }
  }

  private fun animateStackWindow(
    id: String,
    window: Window,
    startY: Int,
    targetY: Int,
  ) {
    stackedWindowAnimators.remove(id)?.cancel()
    setWindowY(window, startY)

    val animator = ValueAnimator.ofInt(startY, targetY).apply {
      duration = 280L
      interpolator = DecelerateInterpolator()
      addUpdateListener { setWindowY(window, it.animatedValue as Int) }
      addListener(object : AnimatorListenerAdapter() {
        override fun onAnimationEnd(animation: Animator) {
          if (stackedWindowAnimators[id] === animation) {
            stackedWindowAnimators.remove(id)
            setWindowY(window, targetY)
          }
        }
      })
    }

    stackedWindowAnimators[id] = animator
    animator.start()
  }

  private fun dismissStacked(id: String, animated: Boolean) {
    val entry = stackedEntries.firstOrNull { it.config.id == id } ?: return
    entry.dismissRunnable?.let { mainHandler.removeCallbacks(it) }
    entry.dismissRunnable = null
    entry.dismissAtUptimeMs = 0L
    stackedWindowAnimators.remove(id)?.cancel()

    if (!animated || entry.config.animation == "none") {
      removeStackedEntry(entry)
      updateStackLayoutIfPossible()
      return
    }

    entry.view.animate()
      .alpha(0f)
      .translationY(14 * entry.view.resources.displayMetrics.density)
      .setDuration(180L)
      .setInterpolator(AccelerateInterpolator())
      .setListener(object : AnimatorListenerAdapter() {
        override fun onAnimationEnd(animation: Animator) {
          entry.view.animate().setListener(null)
          removeStackedEntry(entry)
          updateStackLayoutIfPossible()
        }
      })
      .start()
  }

  private fun dismissAllStacked(animated: Boolean) {
    val entries = stackedEntries.toList()
    if (animated) {
      entries.forEach { dismissStacked(it.config.id, animated = true) }
    } else {
      entries.forEach(::removeStackedEntry)
    }
  }

  private fun removeStackedEntry(entry: StackedEntry) {
    entry.dismissRunnable?.let { mainHandler.removeCallbacks(it) }
    entry.dismissRunnable = null
    entry.dismissAtUptimeMs = 0L
    stackedWindowAnimators.remove(entry.config.id)?.cancel()
    stackedEntries.remove(entry)
    try {
      entry.dialog.dismiss()
    } catch (_: Throwable) {
      // Ignore stale window cleanup failure.
    }
  }

  private fun updateStackLayoutIfPossible() {
    val activity = reactContext.currentActivity ?: return
    if (!activity.isFinishing && !activity.isDestroyed) {
      updateStackLayout(activity)
    }
    if (stackedEntries.isEmpty() && current == null) {
      detachWindowFocusListener()
    }
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
    val animateTopSlide =
      animate && config.animation == "slide" && config.position == "top"

    try {
      nextDialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
      nextDialog.setCanceledOnTouchOutside(false)
      nextDialog.setCancelable(false)
      nextDialog.setContentView(container)

      nextDialog.window?.let {
        configureWindow(it, config, activity, hideTopSlide = animateTopSlide)
      }
      nextDialog.show()
      nextDialog.window?.let {
        configureWindow(it, config, activity, hideTopSlide = animateTopSlide)
      }
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

    if (animateTopSlide) {
      toast.alpha = 1f
      toast.post {
        if (dialog === nextDialog && current?.id == config.id) {
          animateTopWindowIn(nextDialog.window, activity, config, toast.height)
        }
      }
    } else if (animate) {
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

  private fun replaceCurrent(config: ToastConfig) {
    val activity = reactContext.currentActivity ?: return
    val activeDialog = dialog ?: return
    if (activity.isFinishing || activity.isDestroyed) return

    val toast = NativeToastView(activity, config) { dismiss(config.id) }
    val container = createContainer(activity, toast, config)

    try {
      cancelWindowSlideAnimation()
      activeDialog.setContentView(container)
      activeDialog.window?.let { configureWindow(it, config, activity) }
    } catch (error: Throwable) {
      Log.w(TAG, "Failed to update toast", error)
      return
    }

    current = config
    toastView = toast
    toast.alpha = 1f
    toast.translationX = 0f
    toast.translationY = 0f
    toast.scaleX = 1f
    toast.scaleY = 1f
    scheduleAutoDismiss(config, durationOverrideMs = null)
  }

  private fun configureWindow(
    window: Window,
    config: ToastConfig,
    activity: Activity,
    hideTopSlide: Boolean = false,
  ) {
    window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
    window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
    window.addFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE)
    window.addFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL)
    window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
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
      else ->
        if (hideTopSlide) {
          -activity.resources.displayMetrics.heightPixels
        } else {
          dp(activity, config.topOffsetDp)
        }
    }

    attrs.windowAnimations = 0

    window.attributes = attrs
    window.setLayout(attrs.width, attrs.height)
  }

  private fun animateTopWindowIn(
    window: Window?,
    activity: Activity,
    config: ToastConfig,
    toastHeight: Int,
  ) {
    if (window == null) return

    cancelWindowSlideAnimation()

    val startY = -(statusBarHeight(activity) + toastHeight + dp(activity, 8))
    val endY = dp(activity, config.topOffsetDp)
    setWindowY(window, startY)

    val animator = ValueAnimator.ofInt(startY, endY).apply {
      duration = 300L
      interpolator = DecelerateInterpolator()
      addUpdateListener { setWindowY(window, it.animatedValue as Int) }
      addListener(object : AnimatorListenerAdapter() {
        override fun onAnimationEnd(animation: Animator) {
          if (windowSlideAnimator === animation) {
            windowSlideAnimator = null
            setWindowY(window, endY)
          }
        }
      })
    }

    windowSlideAnimator = animator
    animator.start()
  }

  private fun animateTopWindowOut(
    window: Window,
    activity: Activity,
    toastHeight: Int,
    after: () -> Unit,
  ) {
    cancelWindowSlideAnimation()

    val startY = window.attributes.y
    val endY = -(statusBarHeight(activity) + toastHeight + dp(activity, 8))
    val animator = ValueAnimator.ofInt(startY, endY).apply {
      duration = 220L
      interpolator = AccelerateInterpolator()
      addUpdateListener { setWindowY(window, it.animatedValue as Int) }
      addListener(object : AnimatorListenerAdapter() {
        override fun onAnimationEnd(animation: Animator) {
          if (windowSlideAnimator === animation) {
            windowSlideAnimator = null
            after()
          }
        }
      })
    }

    windowSlideAnimator = animator
    animator.start()
  }

  private fun setWindowY(window: Window, y: Int) {
    val attrs = window.attributes
    attrs.y = y
    window.attributes = attrs
  }

  private fun cancelWindowSlideAnimation() {
    val animator = windowSlideAnimator ?: return
    windowSlideAnimator = null
    animator.cancel()
  }

  /**
   * RN Modal and many bottom-sheet libraries use separate application windows.
   * Android stacks a newly attached application window above older windows of
   * the same type, so a permission-free toast cannot reserve a permanent global
   * top layer. When the Activity loses focus, replace covered toast windows
   * with identical, already-visible ones.
   */
  private fun attachWindowFocusListener(activity: Activity) {
    val alreadyAttached =
      attachedActivityRef?.get() === activity && windowFocusListener != null

    if (alreadyAttached) return

    detachWindowFocusListener()

    val decorView = activity.window?.decorView ?: return
    val listener = ViewTreeObserver.OnWindowFocusChangeListener { hasFocus ->
      if (!hasFocus && (current != null || stackedEntries.isNotEmpty())) {
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
    if ((current == null && stackedEntries.isEmpty()) || isRebumpingDialog) return

    pendingZOrderRunnable?.let { mainHandler.removeCallbacks(it) }
    val token = ++zOrderToken
    val runnable = Runnable {
      pendingZOrderRunnable = null
      if (
        token == zOrderToken &&
        (current != null || stackedEntries.isNotEmpty()) &&
        !isRebumpingDialog
      ) {
        if (stackedEntries.isNotEmpty()) {
          rebumpStackedDialogsToFront()
        } else {
          rebumpToastDialogToFront()
        }
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

  private fun rebumpStackedDialogsToFront() {
    val now = SystemClock.uptimeMillis()
    if (now - lastRebumpAtUptimeMs < MIN_REBUMP_INTERVAL_MS) return

    val activity = reactContext.currentActivity ?: return
    if (activity.isFinishing || activity.isDestroyed) return

    val expiredEntries = stackedEntries.filter {
      it.config.durationMs > 0L &&
        it.dismissAtUptimeMs > 0L &&
        it.dismissAtUptimeMs <= now
    }
    expiredEntries.forEach(::removeStackedEntry)
    if (stackedEntries.isEmpty()) {
      if (current == null) detachWindowFocusListener()
      return
    }

    lastRebumpAtUptimeMs = now
    isRebumpingDialog = true

    val remainingById = stackedEntries.associate { entry ->
      val remainingMs = when {
        entry.config.durationMs <= 0L -> 0L
        entry.dismissAtUptimeMs <= 0L -> entry.config.durationMs
        else -> (entry.dismissAtUptimeMs - now).coerceAtLeast(1L)
      }
      entry.config.id to remainingMs
    }

    stackedEntries.forEach { entry ->
      entry.dismissRunnable?.let { mainHandler.removeCallbacks(it) }
      entry.dismissRunnable = null
      stackedWindowAnimators.remove(entry.config.id)?.cancel()
      entry.view.animate().cancel()
    }

    val replacements = mutableListOf<StackedReplacement>()
    val lastIndex = stackedEntries.lastIndex

    try {
      stackedEntries.forEachIndexed { index, entry ->
        val config = entry.config
        val viewConfig = config.copy(haptic = false)
        val toast = NativeToastView(activity, viewConfig) { dismiss(config.id) }
        val container = createContainer(activity, toast, config)
        val nextDialog = Dialog(activity, android.R.style.Theme_Translucent_NoTitleBar)

        nextDialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        nextDialog.setCanceledOnTouchOutside(false)
        nextDialog.setCancelable(false)
        nextDialog.setContentView(container)
        nextDialog.window?.let { configureWindow(it, config, activity) }
        nextDialog.show()
        nextDialog.window?.let { window ->
          configureWindow(window, config, activity)
          val depth = lastIndex - index
          setWindowY(
            window,
            dp(activity, config.topOffsetDp + depth * config.stackOffsetDp)
          )
        }

        val depth = lastIndex - index
        toast.alpha = (1f - depth * 0.2f).coerceAtLeast(0.55f)
        toast.scaleX = (1f - depth * 0.035f).coerceAtLeast(0.9f)
        toast.scaleY = toast.scaleX
        toast.translationX = 0f
        toast.translationY = 0f

        replacements.add(
          StackedReplacement(
            entry = entry,
            oldDialog = entry.dialog,
            oldView = entry.view,
            newDialog = nextDialog,
            newView = toast,
            remainingMs = remainingById[config.id] ?: 0L,
          )
        )
      }
    } catch (error: Throwable) {
      Log.w(TAG, "Failed to move stacked toasts above the new window", error)
      replacements.forEach {
        try {
          it.newDialog.dismiss()
        } catch (_: Throwable) {
          // Ignore replacement cleanup failure.
        }
      }
      stackedEntries.forEach { entry ->
        scheduleStackAutoDismiss(
          entry,
          remainingById[entry.config.id] ?: entry.config.durationMs
        )
      }
      isRebumpingDialog = false
      return
    }

    replacements.forEach { replacement ->
      replacement.entry.dialog = replacement.newDialog
      replacement.entry.view = replacement.newView
      scheduleStackAutoDismiss(
        replacement.entry,
        if (replacement.entry.config.durationMs > 0L) {
          replacement.remainingMs
        } else {
          0L
        }
      )
    }
    attachWindowFocusListener(activity)

    mainHandler.post {
      replacements.forEach { replacement ->
        try {
          replacement.oldView.animate().cancel()
          replacement.oldDialog.dismiss()
        } catch (_: Throwable) {
          // Ignore stale window cleanup failure.
        }
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
    val showing = current
    val activeWindow = dialog?.window
    val activity = reactContext.currentActivity

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

    if (
      animated &&
      view != null &&
      showing != null &&
      showing.animation == "slide" &&
      showing.position == "top" &&
      activeWindow != null &&
      activity != null
    ) {
      animateTopWindowOut(activeWindow, activity, view.height, finish)
    } else if (animated && view != null) {
      view.animateOut(finish)
    } else {
      cancelWindowSlideAnimation()
      finish()
    }
  }

  private fun showNextIfAny() {
    val next = queue.pollFirst() ?: return
    present(next, animate = true, durationOverrideMs = null)
  }

  override fun onHostResume() {
    if (current != null || stackedEntries.isNotEmpty()) {
      scheduleZOrderMaintenance()
    }
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    queue.clear()
    dismissAllStacked(animated = false)
    dismissCurrent(animated = false, showNext = false)
    detachWindowFocusListener()
    mainHandler.removeCallbacksAndMessages(null)
    reactContext.removeLifecycleEventListener(this)
  }

  private fun dp(activity: Activity, value: Int): Int {
    return (value * activity.resources.displayMetrics.density).toInt()
  }

  private fun statusBarHeight(activity: Activity): Int {
    val resources = activity.resources
    val resourceId = resources.getIdentifier("status_bar_height", "dimen", "android")
    return if (resourceId > 0) resources.getDimensionPixelSize(resourceId) else 0
  }

  companion object {
    private const val TAG = "SuperToast"
    private const val REBUMP_DELAY_MS = 32L
    private const val MIN_REBUMP_INTERVAL_MS = 160L
    private const val POST_REBUMP_SUPPRESSION_MS = 96L
  }
}
