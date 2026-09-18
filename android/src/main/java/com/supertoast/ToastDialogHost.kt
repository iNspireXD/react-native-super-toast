package com.supertoast

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.TimeInterpolator
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.Activity
import android.app.Dialog
import android.graphics.Color
import android.graphics.Rect
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.view.Window
import android.view.WindowInsets
import android.view.WindowManager
import android.view.animation.PathInterpolator
import android.widget.FrameLayout
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import java.lang.ref.WeakReference
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Presents every toast in its own non-focusable dialog window, which keeps
 * toasts above React Native modals and bottom sheets. Positioning mirrors
 * ios/SuperToastHost.m.
 */
class ToastDialogHost(
  private val reactContext: ReactApplicationContext,
  private val emitEvent: (id: String, type: String) -> Unit,
) : LifecycleEventListener {
  private class Entry(
    var config: ToastConfig,
    var dialog: Dialog,
    var container: FrameLayout,
    var view: NativeToastView,
  ) {
    var dismissRunnable: Runnable? = null
    var dismissAtUptimeMs = 0L
    var remainingMs = 0L
    var timerPaused = false
    var dismissing = false
    var swiping = false
    var hasEntered = false

    /** Window y for the current layout, excluding swipe and exit offsets. */
    var restingY = 0
    var animator: ValueAnimator? = null
    var animatingToY: Int? = null
  }

  private val entries = mutableListOf<Entry>()
  private val expandedPositions = mutableSetOf<String>()
  private val mainHandler = Handler(Looper.getMainLooper())
  private val easeOutQuart = PathInterpolator(0.165f, 0.84f, 0.44f, 1f)
  private val easeInOutCubic = PathInterpolator(0.645f, 0.045f, 0.355f, 1f)

  private var attachedActivityRef: WeakReference<Activity>? = null
  private var windowFocusListener: ViewTreeObserver.OnWindowFocusChangeListener? = null
  private var globalLayoutListener: ViewTreeObserver.OnGlobalLayoutListener? = null
  private var lastKeyboardInset = 0
  private var zOrderToken = 0
  private var lastRebumpAtUptimeMs = 0L
  private var entryAnimationEndsAtUptimeMs = 0L
  private var pendingZOrderRunnable: Runnable? = null
  private var isRebumpingDialogs = false

  init {
    reactContext.addLifecycleEventListener(this)
  }

  fun show(config: ToastConfig) {
    val activity = usableActivity() ?: return

    val existing = activeEntry(config.id)
    if (existing != null) {
      update(existing, config, activity)
      return
    }

    // A toast re-shown while its previous presentation exits replaces it.
    entries.filter { it.config.id == config.id }.forEach { removeEntry(it, emitRemoved = false) }

    val entry = present(activity, config, initialY = edgeInset(activity, config)) ?: return
    entry.view.alpha = 0f
    entries.add(entry)

    markEntryAnimationInProgress()
    attachActivityListeners(activity)
    scheduleTimer(entry, config.durationMs)
    evictOverflow(config)

    if (activity.window?.decorView?.hasWindowFocus() == false) {
      scheduleZOrderMaintenance()
    }
  }

  fun dismiss(id: String?) {
    entries
      .filter { !it.dismissing && (id == null || it.config.id == id) }
      .forEach { dismissEntry(it, eventType = null) }
  }

  fun wiggle(id: String) {
    activeEntry(id)?.view?.wiggle()
  }

  private fun update(entry: Entry, config: ToastConfig, activity: Activity) {
    val view = createView(activity, config)
    entry.container.removeAllViews()
    entry.container.addView(view, cardLayoutParams())
    entry.dialog.window?.let { configureWindow(it, config) }
    entry.config = config
    entry.view = view
    entry.swiping = false

    scheduleTimer(entry, config.durationMs)
    evictOverflow(config)
  }

  private fun activeEntry(id: String): Entry? =
    entries.firstOrNull { it.config.id == id && !it.dismissing }

  private fun usableActivity(): Activity? =
    reactContext.currentActivity?.takeIf { !it.isFinishing && !it.isDestroyed }

  private fun createView(activity: Activity, config: ToastConfig): NativeToastView =
    NativeToastView(activity, config, listenerFor(config.id)).apply {
      addOnLayoutChangeListener { _, _, top, _, bottom, _, oldTop, _, oldBottom ->
        if (bottom - top != oldBottom - oldTop) {
          mainHandler.post { layoutIfPossible() }
        }
      }
    }

  private fun cardLayoutParams() = FrameLayout.LayoutParams(
    min(screenWidthPx() - dp(32f), dp(MAX_WIDTH_DP)),
    ViewGroup.LayoutParams.WRAP_CONTENT,
  )

  private fun present(activity: Activity, config: ToastConfig, initialY: Int): Entry? {
    val view = createView(activity, config)
    val container = FrameLayout(activity).apply {
      clipChildren = false
      clipToPadding = false
      val padding = dp(SHADOW_PADDING_DP)
      setPadding(padding, padding, padding, padding)
      addView(view, cardLayoutParams())
    }
    val dialog = Dialog(activity, android.R.style.Theme_Translucent_NoTitleBar)

    try {
      dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
      dialog.setCanceledOnTouchOutside(false)
      dialog.setCancelable(false)
      dialog.setContentView(container)
      dialog.window?.let {
        configureWindow(it, config)
        setWindowPosition(it, x = 0, y = initialY)
      }
      dialog.show()
      dialog.window?.let { configureWindow(it, config) }
    } catch (error: Throwable) {
      Log.w(TAG, "Failed to show toast dialog", error)
      try {
        dialog.dismiss()
      } catch (_: Throwable) {
        // Ignore cleanup failure.
      }
      return null
    }

    return Entry(config, dialog, container, view)
  }

  private fun listenerFor(id: String) = object : NativeToastView.Listener {
    override fun onPress() {
      val entry = activeEntry(id) ?: return
      val siblings = entries.count {
        !it.dismissing && it.config.position == entry.config.position
      }
      if (
        entry.config.enableStacking &&
        entry.config.expandOnPress &&
        entry.config.position !in expandedPositions &&
        siblings > 1
      ) {
        expandedPositions.add(entry.config.position)
        layoutIfPossible()
        return
      }
      emitEvent(id, "press")
    }

    override fun onAction() {
      val entry = activeEntry(id) ?: return
      emitEvent(id, "action")
      dismissEntry(entry, eventType = null)
    }

    override fun onCancel() {
      activeEntry(id)?.let { dismissEntry(it, "cancel") }
    }

    override fun onClose() {
      activeEntry(id)?.let { dismissEntry(it, "dismiss") }
    }

    override fun onSwipeStart() {
      val entry = activeEntry(id) ?: return
      cancelAnimator(entry)
      entry.swiping = true
      entry.hasEntered = true
      entry.view.alpha = 1f
      pauseTimer(entry)
    }

    override fun onSwipeMove(offsetPx: Float) {
      val entry = activeEntry(id) ?: return
      val window = entry.dialog.window ?: return
      val translation = entry.view.swipeTranslation(offsetPx)
      val distance = if (entry.view.swipesHorizontally) {
        setWindowPosition(window, x = translation.roundToInt())
        screenWidthPx().toFloat()
      } else {
        setWindowPosition(window, y = entry.restingY + translation.roundToInt())
        dp(60f).toFloat()
      }
      entry.container.alpha = (1f + offsetPx / distance).coerceIn(0f, 1f)
    }

    override fun onSwipeEnd(offsetPx: Float) {
      val entry = activeEntry(id) ?: return
      entry.swiping = false
      val threshold = if (entry.view.swipesHorizontally) {
        -screenWidthPx() * 0.25f
      } else {
        -dp(20f).toFloat()
      }
      if (offsetPx < threshold) {
        dismissEntry(entry, "dismiss")
      } else {
        restoreSwipe(entry)
      }
    }
  }

  private fun restoreSwipe(entry: Entry) {
    val window = entry.dialog.window ?: return
    val startX = window.attributes.x
    val startY = window.attributes.y
    val startAlpha = entry.container.alpha
    val targetY = entry.restingY

    animate(entry, SWIPE_RESTORE_MS, easeOutQuart, targetY) { fraction ->
      setWindowPosition(
        window,
        x = lerp(startX, 0, fraction),
        y = lerp(startY, targetY, fraction),
      )
      entry.container.alpha = startAlpha + (1f - startAlpha) * fraction
    }
    resumeTimer(entry)
  }

  private fun layoutIfPossible() {
    val activity = usableActivity() ?: return
    POSITIONS.forEach { layoutPosition(activity, it) }
  }

  private fun layoutPosition(activity: Activity, position: String) {
    // Newest first, matching SuperToastHost.m on iOS.
    val active = entries.filter { !it.dismissing && it.config.position == position }.asReversed()
    val front = active.firstOrNull() ?: return
    if (
      active.size <= 1 ||
      !front.config.enableStacking ||
      !front.config.expandOnPress
    ) {
      expandedPositions.remove(position)
    }
    val stacking = front.config.enableStacking && position !in expandedPositions
    val gap = dp(front.config.gapDp)
    val frontHeight = front.view.height
    // Center toasts re-center in the space the keyboard leaves above it.
    val centerLift = if (position == "center") {
      max(0, keyboardInset(activity) - systemInsets(activity).second) / 2
    } else {
      0
    }
    var cursor = 0

    active.forEachIndexed { depth, entry ->
      val height = entry.view.height
      val distance = if (stacking) {
        max(0, frontHeight - height) + depth * dp(STACK_GAP_DP)
      } else {
        cursor
      }
      cursor += height + gap

      val window = entry.dialog.window ?: return@forEachIndexed
      entry.restingY = when (position) {
        "center" -> distance + height / 2 - frontHeight / 2 - centerLift
        else -> edgeInset(activity, entry.config) + distance - dp(SHADOW_PADDING_DP)
      }
      setTouchable(window, !stacking || depth == 0)
      applyScale(entry, if (stacking) max(0.85f, 1f - depth * 0.05f) else 1f)

      when {
        entry.swiping -> Unit
        !entry.hasEntered -> if (height > 0) enter(entry, window)
        else -> reflow(entry, window)
      }
    }
  }

  private fun enter(entry: Entry, window: Window) {
    entry.hasEntered = true
    val targetY = entry.restingY
    // Sonner enters from 20pt above at the top and 50pt below elsewhere.
    val startY = targetY + when (entry.config.position) {
      "top-center" -> -dp(20f)
      "bottom-center" -> -dp(50f)
      else -> dp(50f)
    }
    val view = entry.view
    setWindowPosition(window, x = 0, y = startY)

    animate(entry, ENTER_MS, easeOutQuart, targetY) { fraction ->
      setWindowPosition(window, y = lerp(startY, targetY, fraction))
      view.alpha = fraction
    }
  }

  private fun reflow(entry: Entry, window: Window) {
    val targetY = entry.restingY
    if (entry.animator != null && entry.animatingToY == targetY) return
    if (entry.animator == null && window.attributes.y == targetY) return

    val startY = window.attributes.y
    val view = entry.view
    val startAlpha = view.alpha

    animate(entry, REFLOW_MS, easeOutQuart, targetY) { fraction ->
      setWindowPosition(window, y = lerp(startY, targetY, fraction))
      view.alpha = startAlpha + (1f - startAlpha) * fraction
    }
  }

  private fun applyScale(entry: Entry, scale: Float) {
    val container = entry.container
    if (container.scaleX == scale) return

    val padding = dp(SHADOW_PADDING_DP).toFloat()
    container.pivotX = container.width / 2f
    container.pivotY = when (entry.config.position) {
      "top-center" -> container.height - padding
      "bottom-center" -> padding
      else -> container.height / 2f
    }
    container.animate()
      .scaleX(scale)
      .scaleY(scale)
      .setDuration(REFLOW_MS)
      .setInterpolator(easeOutQuart)
      .start()
  }

  private fun dismissEntry(entry: Entry, eventType: String?) {
    if (entry.dismissing) return
    entry.dismissing = true
    entry.swiping = false
    cancelTimer(entry)
    eventType?.let { emitEvent(entry.config.id, it) }

    val window = entry.dialog.window
    if (window == null || usableActivity() == null) {
      removeEntry(entry, emitRemoved = true)
      layoutIfPossible()
      return
    }

    val startX = window.attributes.x
    val startY = window.attributes.y
    val startAlpha = entry.container.alpha
    val hasSiblings = entries.any {
      it !== entry && !it.dismissing && it.config.position == entry.config.position
    }
    val swipedVertically = startY != entry.restingY
    val distance = dp(if (hasSiblings && !swipedVertically) 8f else 150f)
    val direction = when {
      startY < entry.restingY -> -1
      startY > entry.restingY -> 1
      entry.config.position == "center" -> 1
      else -> -1
    }
    val targetX = when {
      startX < 0 -> -screenWidthPx()
      startX > 0 -> screenWidthPx()
      else -> 0
    }

    setTouchable(window, false)
    animate(
      entry,
      EXIT_MS,
      easeInOutCubic,
      targetY = null,
      onEnd = { removeEntry(entry, emitRemoved = true) },
    ) { fraction ->
      setWindowPosition(
        window,
        x = lerp(startX, targetX, fraction),
        y = startY + (direction * distance * fraction).roundToInt(),
      )
      entry.container.alpha = startAlpha * (1f - fraction)
    }

    layoutIfPossible()
  }

  private fun removeEntry(entry: Entry, emitRemoved: Boolean) {
    if (!entries.remove(entry)) return

    cancelTimer(entry)
    cancelAnimator(entry)
    entry.container.animate().cancel()
    try {
      entry.dialog.dismiss()
    } catch (_: Throwable) {
      // Ignore stale window cleanup failure.
    }

    if (emitRemoved) emitEvent(entry.config.id, "removed")

    val remainingAtPosition = entries.count {
      !it.dismissing && it.config.position == entry.config.position
    }
    if (remainingAtPosition <= 1) expandedPositions.remove(entry.config.position)

    if (entries.isEmpty()) {
      cancelPendingZOrderMaintenance()
      detachActivityListeners()
    }
  }

  private fun evictOverflow(config: ToastConfig) {
    val active = entries.filter { !it.dismissing && it.config.position == config.position }
    val overflow = active.size - config.visibleToasts
    if (overflow > 0) {
      active.take(overflow).forEach { dismissEntry(it, eventType = null) }
    }
  }

  private fun animate(
    entry: Entry,
    durationMs: Long,
    interpolator: TimeInterpolator,
    targetY: Int?,
    onEnd: (() -> Unit)? = null,
    onUpdate: (Float) -> Unit,
  ) {
    cancelAnimator(entry)

    val animator = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = durationMs
      this.interpolator = interpolator
      addUpdateListener { onUpdate(it.animatedValue as Float) }
      addListener(object : AnimatorListenerAdapter() {
        private var cancelled = false

        override fun onAnimationCancel(animation: Animator) {
          cancelled = true
        }

        override fun onAnimationEnd(animation: Animator) {
          if (entry.animator === animation) {
            entry.animator = null
            entry.animatingToY = null
          }
          if (!cancelled) onEnd?.invoke()
        }
      })
    }

    entry.animator = animator
    entry.animatingToY = targetY
    animator.start()
  }

  private fun cancelAnimator(entry: Entry) {
    val animator = entry.animator ?: return
    entry.animator = null
    entry.animatingToY = null
    animator.cancel()
  }

  private fun scheduleTimer(entry: Entry, delayMs: Long) {
    cancelTimer(entry)
    if (entry.config.durationMs <= 0L) return

    val runnable = Runnable {
      entry.dismissRunnable = null
      if (entries.contains(entry)) dismissEntry(entry, "autoClose")
    }
    entry.dismissRunnable = runnable
    entry.dismissAtUptimeMs = SystemClock.uptimeMillis() + delayMs
    mainHandler.postDelayed(runnable, delayMs)
  }

  private fun pauseTimer(entry: Entry) {
    val runnable = entry.dismissRunnable ?: return
    mainHandler.removeCallbacks(runnable)
    entry.dismissRunnable = null
    entry.remainingMs = max(0L, entry.dismissAtUptimeMs - SystemClock.uptimeMillis())
    entry.timerPaused = true
  }

  private fun resumeTimer(entry: Entry) {
    if (!entry.timerPaused) return
    scheduleTimer(entry, max(entry.remainingMs, 1000L))
  }

  private fun cancelTimer(entry: Entry) {
    entry.dismissRunnable?.let { mainHandler.removeCallbacks(it) }
    entry.dismissRunnable = null
    entry.dismissAtUptimeMs = 0L
    entry.timerPaused = false
  }

  private fun configureWindow(window: Window, config: ToastConfig) {
    window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
    window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
    // Screen coordinates: the host adds system bar insets itself.
    window.addFlags(
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
    )
    window.setDimAmount(0f)
    window.decorView.setPadding(0, 0, 0, 0)

    val attrs = window.attributes
    attrs.gravity = when (config.position) {
      "bottom-center" -> Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
      "center" -> Gravity.CENTER
      else -> Gravity.TOP or Gravity.CENTER_HORIZONTAL
    }
    attrs.width = WindowManager.LayoutParams.WRAP_CONTENT
    attrs.height = WindowManager.LayoutParams.WRAP_CONTENT
    attrs.windowAnimations = 0
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      attrs.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
      attrs.fitInsetsTypes = 0
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      attrs.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
    }
    window.attributes = attrs
  }

  private fun setWindowPosition(window: Window, x: Int? = null, y: Int? = null) {
    val attrs = window.attributes
    if ((x == null || attrs.x == x) && (y == null || attrs.y == y)) return
    x?.let { attrs.x = it }
    y?.let { attrs.y = it }
    window.attributes = attrs
  }

  private fun setTouchable(window: Window, touchable: Boolean) {
    val flag = WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
    val isTouchable = window.attributes.flags and flag == 0
    if (isTouchable == touchable) return
    if (touchable) window.clearFlags(flag) else window.addFlags(flag)
  }

  /** Distance from the anchored screen edge to the card's outer edge. */
  private fun edgeInset(activity: Activity, config: ToastConfig): Int {
    val (top, bottom) = systemInsets(activity)
    val inset = if (config.position == "bottom-center") max(bottom, keyboardInset(activity)) else top
    val offset = config.offsetDp ?: if (inset > 0) DEFAULT_OFFSET_DP else DEFAULT_EDGE_OFFSET_DP
    return inset + dp(offset)
  }

  private fun systemInsets(activity: Activity): Pair<Int, Int> {
    val insets = activity.window?.decorView?.rootWindowInsets
    if (insets != null) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
        return bars.top to bars.bottom
      }
      @Suppress("DEPRECATION")
      return insets.systemWindowInsetTop to insets.systemWindowInsetBottom
    }
    return systemDimension(activity, "status_bar_height") to
      systemDimension(activity, "navigation_bar_height")
  }

  /**
   * Height the soft keyboard covers at the bottom of the screen. Toast dialogs
   * are not focusable, so Android stacks them above the keyboard instead of
   * moving them out of its way.
   */
  private fun keyboardInset(activity: Activity): Int {
    val decorView = activity.window?.decorView ?: return 0
    return keyboardInset(decorView)
  }

  private fun keyboardInset(decorView: View): Int {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val insets = decorView.rootWindowInsets ?: return 0
      if (!insets.isVisible(WindowInsets.Type.ime())) return 0
      return insets.getInsets(WindowInsets.Type.ime()).bottom
    }
    // Before Android 11 the keyboard covers whatever the visible frame leaves
    // out. This includes the navigation bar, which edgeInset already allows for.
    val visible = Rect()
    decorView.getWindowVisibleDisplayFrame(visible)
    return max(0, decorView.rootView.height - visible.bottom)
  }

  @SuppressLint("DiscouragedApi", "InternalInsetResource")
  private fun systemDimension(activity: Activity, name: String): Int {
    val resources = activity.resources
    val resourceId = resources.getIdentifier(name, "dimen", "android")
    return if (resourceId > 0) resources.getDimensionPixelSize(resourceId) else 0
  }

  /**
   * RN Modal and many bottom-sheet libraries use separate application windows.
   * Android stacks a newly attached application window above older windows of
   * the same type, so a permission-free toast cannot reserve a permanent global
   * top layer. When the Activity loses focus, replace covered toast windows
   * with identical, already-visible ones.
   */
  private fun attachActivityListeners(activity: Activity) {
    if (attachedActivityRef?.get() === activity && windowFocusListener != null) return

    detachActivityListeners()

    val decorView = activity.window?.decorView ?: return
    val focusListener = ViewTreeObserver.OnWindowFocusChangeListener { hasFocus ->
      if (!hasFocus && entries.isNotEmpty()) scheduleZOrderMaintenance()
    }
    // The keyboard showing, hiding, or resizing relayouts the Activity; React
    // Native's own Keyboard events rely on the same signal.
    val layoutListener = ViewTreeObserver.OnGlobalLayoutListener {
      val inset = keyboardInset(decorView)
      if (inset != lastKeyboardInset) {
        lastKeyboardInset = inset
        layoutIfPossible()
      }
    }

    try {
      decorView.viewTreeObserver.addOnWindowFocusChangeListener(focusListener)
      decorView.viewTreeObserver.addOnGlobalLayoutListener(layoutListener)
      attachedActivityRef = WeakReference(activity)
      windowFocusListener = focusListener
      globalLayoutListener = layoutListener
      lastKeyboardInset = keyboardInset(decorView)
    } catch (_: Throwable) {
      attachedActivityRef = null
      windowFocusListener = null
      globalLayoutListener = null
    }
  }

  private fun detachActivityListeners() {
    val activity = attachedActivityRef?.get()

    if (activity != null) {
      try {
        val observer = activity.window?.decorView?.viewTreeObserver
        if (observer?.isAlive == true) {
          windowFocusListener?.let { observer.removeOnWindowFocusChangeListener(it) }
          globalLayoutListener?.let { observer.removeOnGlobalLayoutListener(it) }
        }
      } catch (_: Throwable) {
        // Ignore listener cleanup failure.
      }
    }

    attachedActivityRef = null
    windowFocusListener = null
    globalLayoutListener = null
  }

  private fun scheduleZOrderMaintenance() {
    if (entries.isEmpty() || isRebumpingDialogs) return

    pendingZOrderRunnable?.let { mainHandler.removeCallbacks(it) }
    val token = ++zOrderToken
    val runnable = Runnable {
      pendingZOrderRunnable = null
      if (token == zOrderToken && entries.isNotEmpty() && !isRebumpingDialogs) {
        rebumpDialogsToFront()
      }
    }

    pendingZOrderRunnable = runnable
    val entryAnimationRemainingMs = entryAnimationEndsAtUptimeMs - SystemClock.uptimeMillis()
    mainHandler.postDelayed(runnable, max(REBUMP_DELAY_MS, entryAnimationRemainingMs))
  }

  /**
   * Showing our non-focusable dialog can itself produce the Activity focus-loss
   * signal used for z-order maintenance. Do not replace a newly attached dialog
   * while its entrance is still running, or the animation would jump to its end.
   */
  private fun markEntryAnimationInProgress() {
    entryAnimationEndsAtUptimeMs = max(
      entryAnimationEndsAtUptimeMs,
      SystemClock.uptimeMillis() + ENTER_MS,
    )
  }

  private fun cancelPendingZOrderMaintenance() {
    pendingZOrderRunnable?.let { mainHandler.removeCallbacks(it) }
    pendingZOrderRunnable = null
    zOrderToken++
  }

  private fun rebumpDialogsToFront() {
    val now = SystemClock.uptimeMillis()
    if (now - lastRebumpAtUptimeMs < MIN_REBUMP_INTERVAL_MS) return

    val activity = usableActivity() ?: return

    entries.filter { it.dismissing }.forEach { removeEntry(it, emitRemoved = true) }
    if (entries.isEmpty()) return

    lastRebumpAtUptimeMs = now
    isRebumpingDialogs = true

    val replacements = mutableListOf<Pair<Entry, Entry>>()
    for (entry in entries) {
      // This is the same toast, not a new presentation: no haptics or entrance.
      val replacement = present(activity, entry.config.copy(haptic = false), entry.restingY)
      if (replacement == null) {
        replacements.forEach { (_, created) ->
          try {
            created.dialog.dismiss()
          } catch (_: Throwable) {
            // Ignore replacement cleanup failure.
          }
        }
        isRebumpingDialogs = false
        return
      }
      replacements.add(entry to replacement)
    }

    replacements.forEach { (entry, replacement) ->
      val oldDialog = entry.dialog
      val oldContainer = entry.container

      cancelAnimator(entry)
      replacement.container.scaleX = oldContainer.scaleX
      replacement.container.scaleY = oldContainer.scaleY
      replacement.view.alpha = 1f
      entry.hasEntered = true
      entry.swiping = false
      entry.dialog = replacement.dialog
      entry.container = replacement.container
      entry.view = replacement.view

      // Attach the replacement first. The stale toast is already covered by
      // the new window, so removing it on the next loop leaves no blank frame.
      mainHandler.post {
        try {
          oldContainer.animate().cancel()
          oldDialog.dismiss()
        } catch (_: Throwable) {
          // Ignore stale window cleanup failure.
        }
      }
    }

    attachActivityListeners(activity)
    mainHandler.postDelayed({ isRebumpingDialogs = false }, POST_REBUMP_SUPPRESSION_MS)
  }

  override fun onHostResume() {
    if (entries.isNotEmpty()) scheduleZOrderMaintenance()
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    entries.toList().forEach { removeEntry(it, emitRemoved = false) }
    detachActivityListeners()
    mainHandler.removeCallbacksAndMessages(null)
    reactContext.removeLifecycleEventListener(this)
  }

  private fun screenWidthPx(): Int =
    usableActivity()?.window?.decorView?.width?.takeIf { it > 0 }
      ?: reactContext.resources.displayMetrics.widthPixels

  private fun dp(value: Float): Int =
    (value * reactContext.resources.displayMetrics.density).roundToInt()

  private fun lerp(start: Int, end: Int, fraction: Float): Int =
    (start + (end - start) * fraction).roundToInt()

  companion object {
    private const val TAG = "SuperToast"
    private val POSITIONS = listOf("top-center", "bottom-center", "center")

    private const val ENTER_MS = 300L
    private const val EXIT_MS = 300L
    private const val REFLOW_MS = 400L
    private const val SWIPE_RESTORE_MS = 250L

    private const val MAX_WIDTH_DP = 500f
    private const val SHADOW_PADDING_DP = 12f
    private const val STACK_GAP_DP = 8f
    private const val DEFAULT_OFFSET_DP = 8f
    private const val DEFAULT_EDGE_OFFSET_DP = 16f

    private const val REBUMP_DELAY_MS = 32L
    private const val MIN_REBUMP_INTERVAL_MS = 160L
    private const val POST_REBUMP_SUPPRESSION_MS = 96L
  }
}
