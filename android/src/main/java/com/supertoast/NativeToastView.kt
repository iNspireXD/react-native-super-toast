package com.supertoast

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Outline
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.net.Uri
import android.os.Build
import android.util.Base64
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.accessibility.AccessibilityEvent
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.facebook.react.common.assets.ReactFontManager
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.abs
import kotlin.math.roundToInt

/** Toast card with an icon, title, description, buttons, and close control. */
@SuppressLint("ViewConstructor")
class NativeToastView(
  context: Context,
  val config: ToastConfig,
  private val listener: Listener,
) : LinearLayout(context) {
  interface Listener {
    fun onPress()
    fun onAction()
    fun onCancel()
    fun onClose()
    fun onSwipeStart()

    /** Offset along the swipe axis. Negative values move towards dismissal. */
    fun onSwipeMove(offsetPx: Float)
    fun onSwipeEnd(offsetPx: Float)
  }

  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
  private var downX = 0f
  private var downY = 0f
  private var isSwiping = false
  private var isTapCandidate = false
  private var wiggleAnimator: ValueAnimator? = null

  val swipesHorizontally: Boolean
    get() = config.swipeDirection == "left"

  init {
    orientation = HORIZONTAL
    gravity = if (config.description == null) Gravity.CENTER_VERTICAL else Gravity.TOP
    isClickable = true
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
    contentDescription = listOfNotNull(config.title.takeIf { it.isNotBlank() }, config.description)
      .joinToString(". ")

    background = boxBackground(config.style)
    elevation = dp(4f)
    setPadding(
      dp(config.style.paddingHorizontalDp).roundToInt(),
      dp(config.style.paddingVerticalDp).roundToInt(),
      dp(config.style.paddingHorizontalDp).roundToInt(),
      dp(config.style.paddingVerticalDp).roundToInt(),
    )

    createIconView()?.let { iconView ->
      val params = iconView.layoutParams as? LayoutParams
        ?: LayoutParams(dpInt(20f), dpInt(20f))
      params.marginEnd = dpInt(16f)
      addView(iconView, params)
    }

    val column = LinearLayout(context).apply { orientation = VERTICAL }

    if (config.title.isNotBlank()) {
      column.addView(createText(config.title, config.titleStyle))
    }

    config.description?.let { description ->
      column.addView(
        createText(description, config.descriptionStyle),
        LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
          if (config.title.isNotBlank()) topMargin = dpInt(2f)
        },
      )
    }

    if (config.action != null || config.cancel != null) {
      val buttons = LinearLayout(context).apply {
        orientation = HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
      }
      config.action?.let { buttons.addView(createButton(it) { listener.onAction() }) }
      config.cancel?.let {
        buttons.addView(
          createButton(it) { listener.onCancel() },
          LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            if (config.action != null) marginStart = dpInt(16f)
          },
        )
      }
      column.addView(
        buttons,
        LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
          topMargin = dpInt(16f)
        },
      )
    }

    addView(column, LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

    if (config.closeButton && config.dismissible) {
      val touchPadding = dpInt(6f)
      val close = ToastGlyphView(context, "close", config.closeButtonColor).apply {
        setPadding(touchPadding, touchPadding, touchPadding, touchPadding)
        isClickable = true
        contentDescription = "Close"
        background = RippleDrawable(ColorStateList.valueOf(PRESSED_OVERLAY), null, null)
        setOnClickListener { listener.onClose() }
      }
      // The glyph is 20dp; negative margins keep a 32dp touch target without
      // changing the card layout.
      addView(
        close,
        LayoutParams(dpInt(32f), dpInt(32f)).apply {
          marginStart = dpInt(10f)
          marginEnd = -touchPadding
          topMargin = -touchPadding
          bottomMargin = -touchPadding
        },
      )
    }
  }

  private fun boxBackground(style: ToastBoxStyle) = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    cornerRadius = dp(style.borderRadiusDp)
    setColor(style.backgroundColor)
    if (style.borderWidthDp > 0f) {
      setStroke(dp(style.borderWidthDp).roundToInt().coerceAtLeast(1), style.borderColor)
    }
  }

  private fun createText(value: String, style: ToastTextStyle) = TextView(context).apply {
    text = value
    applyTextStyle(style)
  }

  private fun TextView.applyTextStyle(style: ToastTextStyle) {
    setTextColor(style.color)
    setTextSize(TypedValue.COMPLEX_UNIT_SP, style.fontSizeSp)
    typeface = resolveTypeface(style)
    includeFontPadding = false
    style.lineHeightSp?.let { lineHeightSp ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        lineHeight = TypedValue.applyDimension(
          TypedValue.COMPLEX_UNIT_SP,
          lineHeightSp,
          resources.displayMetrics,
        ).roundToInt()
      }
    }
  }

  private fun createButton(button: ToastButtonConfig, onClick: () -> Unit) = TextView(context).apply {
    text = button.label
    maxLines = 1
    applyTextStyle(button.textStyle)
    setPadding(
      dp(button.style.paddingHorizontalDp).roundToInt(),
      dp(button.style.paddingVerticalDp).roundToInt(),
      dp(button.style.paddingHorizontalDp).roundToInt(),
      dp(button.style.paddingVerticalDp).roundToInt(),
    )
    val mask = GradientDrawable().apply {
      cornerRadius = dp(button.style.borderRadiusDp)
      setColor(Color.WHITE)
    }
    background = RippleDrawable(
      ColorStateList.valueOf(PRESSED_OVERLAY),
      boxBackground(button.style),
      mask,
    )
    isClickable = true
    setOnClickListener { onClick() }
  }

  private fun resolveTypeface(style: ToastTextStyle): Typeface {
    val weight = style.fontWeight.coerceIn(1, 1000)
    val family = style.fontFamily
    if (family != null) {
      return ReactFontManager.getInstance().getTypeface(family, weight, false, context.assets)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      return Typeface.create(Typeface.DEFAULT, weight, false)
    }
    return if (weight >= 600) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
  }

  private fun createIconView(): View? {
    val icon = config.icon ?: return createStateIconView()

    return when (icon.type) {
      "font" -> {
        val glyph = icon.glyph?.takeIf { it.isNotBlank() } ?: return null
        val size = icon.sizeDp ?: 20
        TextView(context).apply {
          text = glyph
          setTextSize(TypedValue.COMPLEX_UNIT_DIP, size.toFloat())
          setTextColor(icon.color ?: config.iconColor)
          gravity = Gravity.CENTER
          includeFontPadding = false
          typeface = icon.fontFamily?.let {
            ReactFontManager.getInstance().getTypeface(it, Typeface.NORMAL, context.assets)
          }
          layoutParams = LayoutParams(dpInt(size.toFloat()), dpInt(size.toFloat()))
        }
      }

      "image" -> {
        val uri = icon.uri?.takeIf { it.isNotBlank() } ?: return null
        ImageView(context).apply {
          layoutParams = LayoutParams(
            dpInt((icon.widthDp ?: icon.sizeDp ?: 20).toFloat()),
            dpInt((icon.heightDp ?: icon.sizeDp ?: 20).toFloat()),
          )
          adjustViewBounds = true
          scaleType = ImageView.ScaleType.CENTER_INSIDE
          icon.tintColor?.let { imageTintList = ColorStateList.valueOf(it) }
          applyCornerRadius(icon.cornerRadiusDp)
          loadImageUri(uri)
        }
      }

      else -> {
        val value = icon.value?.takeIf { it.isNotBlank() } ?: return null
        TextView(context).apply {
          text = value
          setTextSize(TypedValue.COMPLEX_UNIT_DIP, (icon.sizeDp ?: 20).toFloat())
          setTextColor(icon.color ?: config.iconColor)
          gravity = Gravity.CENTER
          includeFontPadding = false
          layoutParams = LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
          )
        }
      }
    }
  }

  private fun createStateIconView(): View? = when (config.variant) {
    "loading" -> ProgressBar(context, null, android.R.attr.progressBarStyleSmall).apply {
      isIndeterminate = true
      indeterminateTintList = ColorStateList.valueOf(config.iconColor)
    }
    "success", "error", "warning", "info" -> ToastGlyphView(context, config.variant, config.iconColor)
    else -> null
  }

  private fun ImageView.applyCornerRadius(radiusDp: Int) {
    if (radiusDp <= 0) return

    clipToOutline = true
    outlineProvider = object : ViewOutlineProvider() {
      override fun getOutline(view: View, outline: Outline) {
        outline.setRoundRect(0, 0, view.width, view.height, dp(radiusDp.toFloat()))
      }
    }
  }

  private fun ImageView.loadImageUri(uri: String) {
    when {
      uri.startsWith("http://") || uri.startsWith("https://") -> loadNetworkImage(uri)
      uri.startsWith("asset:/") -> loadAssetImage(uri)
      uri.startsWith("data:image/") -> loadDataUri(uri)
      Uri.parse(uri).scheme == null -> loadDrawableResource(uri)
      else -> setImageURI(Uri.parse(uri))
    }
  }

  @SuppressLint("DiscouragedApi")
  private fun ImageView.loadDrawableResource(name: String) {
    try {
      val resourceId = resources.getIdentifier(
        name.lowercase().replace("-", "_"),
        "drawable",
        context.packageName,
      )
      if (resourceId != 0) setImageResource(resourceId)
    } catch (_: Throwable) {
      // Icon loading must never crash toast rendering.
    }
  }

  private fun ImageView.loadDataUri(uri: String) {
    try {
      val encoded = uri.substringAfter(',', missingDelimiterValue = "")
      if (encoded.isEmpty()) return

      val bytes = Base64.decode(encoded, Base64.DEFAULT)
      setImageBitmap(BitmapFactory.decodeByteArray(bytes, 0, bytes.size))
    } catch (_: Throwable) {
      // Icon loading must never crash toast rendering.
    }
  }

  private fun ImageView.loadNetworkImage(uri: String) {
    Thread {
      try {
        val connection = (URL(uri).openConnection() as HttpURLConnection).apply {
          connectTimeout = 5000
          readTimeout = 5000
        }
        val bitmap = connection.inputStream.use { BitmapFactory.decodeStream(it) }
        post { setImageBitmap(bitmap) }
      } catch (_: Throwable) {
        // Icon loading must never crash toast rendering.
      }
    }.start()
  }

  private fun ImageView.loadAssetImage(uri: String) {
    try {
      val path = uri.removePrefix("asset:/").removePrefix("/")
      val bitmap = context.assets.open(path).use { BitmapFactory.decodeStream(it) }
      setImageBitmap(bitmap)
    } catch (_: Throwable) {
      // Icon loading must never crash toast rendering.
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    announceForAccessibility(contentDescription)
    sendAccessibilityEvent(AccessibilityEvent.TYPE_ANNOUNCEMENT)
    if (config.haptic) {
      try {
        performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
      } catch (_: Throwable) {
        // Optional haptics must never crash toast rendering.
      }
    }
  }

  override fun onDetachedFromWindow() {
    wiggleAnimator?.cancel()
    super.onDetachedFromWindow()
  }

  fun wiggle() {
    wiggleAnimator?.cancel()
    wiggleAnimator = ValueAnimator.ofFloat(1f, 1.035f).apply {
      duration = 150
      repeatCount = 3
      repeatMode = ValueAnimator.REVERSE
      addUpdateListener {
        val value = it.animatedValue as Float
        scaleX = value
        scaleY = value
      }
      start()
    }
  }

  // Buttons inside the card consume taps, so swipes are stolen here once the
  // gesture clearly moves along the dismiss axis.
  override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> startGesture(event)
      MotionEvent.ACTION_MOVE -> if (!isSwiping && shouldStartSwipe(event)) {
        beginSwipe()
        return true
      }
    }
    return isSwiping
  }

  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        startGesture(event)
        isPressed = true
      }

      MotionEvent.ACTION_MOVE -> {
        if (!isSwiping) {
          if (shouldStartSwipe(event)) {
            beginSwipe()
          } else if (abs(event.rawX - downX) > touchSlop || abs(event.rawY - downY) > touchSlop) {
            isTapCandidate = false
            isPressed = false
          }
        }
        if (isSwiping) listener.onSwipeMove(swipeOffset(event))
      }

      MotionEvent.ACTION_UP -> {
        when {
          isSwiping -> listener.onSwipeEnd(swipeOffset(event))
          isTapCandidate -> performClick()
        }
        endGesture()
      }

      MotionEvent.ACTION_CANCEL -> {
        if (isSwiping) listener.onSwipeEnd(0f)
        endGesture()
      }
    }
    return true
  }

  override fun performClick(): Boolean {
    super.performClick()
    listener.onPress()
    return true
  }

  private fun startGesture(event: MotionEvent) {
    downX = event.rawX
    downY = event.rawY
    isSwiping = false
    isTapCandidate = true
  }

  private fun endGesture() {
    isPressed = false
    isSwiping = false
    isTapCandidate = false
    parent?.requestDisallowInterceptTouchEvent(false)
  }

  private fun beginSwipe() {
    isSwiping = true
    isTapCandidate = false
    isPressed = false
    parent?.requestDisallowInterceptTouchEvent(true)
    listener.onSwipeStart()
  }

  private fun shouldStartSwipe(event: MotionEvent): Boolean {
    if (!config.dismissible) return false
    val dx = abs(event.rawX - downX)
    val dy = abs(event.rawY - downY)
    return if (swipesHorizontally) dx > touchSlop && dx > dy else dy > touchSlop && dy > dx
  }

  private fun swipeOffset(event: MotionEvent): Float {
    val raw = when {
      swipesHorizontally -> event.rawX - downX
      config.position == "bottom-center" -> downY - event.rawY
      else -> event.rawY - downY
    }
    if (raw < 0f) return raw

    // Elastic resistance away from the dismiss direction.
    val distance = raw / resources.displayMetrics.density
    return dp(distance * 0.4f / (1f + distance * 0.02f))
  }

  private fun dp(value: Float): Float = value * resources.displayMetrics.density

  private fun dpInt(value: Float): Int = dp(value).roundToInt()

  companion object {
    private const val PRESSED_OVERLAY = 0x1F000000
  }
}
