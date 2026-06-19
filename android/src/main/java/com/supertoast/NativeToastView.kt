package com.supertoast

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.BitmapFactory
import android.graphics.Outline
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.View.MeasureSpec
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.accessibility.AccessibilityEvent
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.abs

class NativeToastView(
  context: Context,
  private val config: ToastConfig,
  private val onDismissRequested: () -> Unit,
) : LinearLayout(context) {
  private var downY = 0f
  private var downX = 0f
  private var translationStart = 0f
  var maxWidthPx: Int = 0

  init {
    orientation = HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    isClickable = config.closeOnPress || config.swipeToDismiss
    isFocusable = false
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
    contentDescription = listOfNotNull(config.title, config.message).joinToString(". ")

    val bg = GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = dp(config.borderRadiusDp).toFloat()
      setColor(config.backgroundColor)
      if (config.borderWidthDp > 0) setStroke(dp(config.borderWidthDp), config.borderColor)
    }
    background = bg
    elevation = dp(config.elevationDp).toFloat()
    setPadding(
      dp(config.paddingHorizontalDp),
      dp(config.paddingVerticalDp),
      dp(config.paddingHorizontalDp),
      dp(config.paddingVerticalDp)
    )

    createIconView()?.let { iconView ->
      addView(
        iconView,
        LayoutParams(iconView.layoutParams.width, iconView.layoutParams.height).apply {
          marginEnd = dp(config.gapDp)
        }
      )
    }

    val texts = LinearLayout(context).apply {
      orientation = VERTICAL
      gravity = Gravity.CENTER_VERTICAL
    }

    config.title?.takeIf { it.isNotBlank() }?.let { title ->
      texts.addView(TextView(context).apply {
        text = title
        textSize = config.titleSizeSp
        setTextColor(config.titleColor)
        typeface = Typeface.DEFAULT_BOLD
        includeFontPadding = false
        maxLines = 2
      })
    }

    config.message?.takeIf { it.isNotBlank() }?.let { message ->
      texts.addView(TextView(context).apply {
        text = message
        textSize = config.messageSizeSp
        setTextColor(config.messageColor)
        includeFontPadding = true
        maxLines = 4
      }, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
        if (!config.title.isNullOrBlank()) topMargin = dp(2)
      })
    }

    addView(texts, LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

    setOnClickListener {
      if (config.closeOnPress) onDismissRequested()
    }

    if (config.swipeToDismiss) {
      setOnTouchListener { _, event -> handleSwipe(event) }
    }
  }

  private fun createIconView(): View? {
    val icon = config.icon ?: return null
    val defaultSize = dp(icon.sizeDp ?: 22)

    return when (icon.type) {
      "font" -> {
        val glyph = icon.glyph?.takeIf { it.isNotBlank() } ?: return null
        TextView(context).apply {
          text = glyph
          textSize = (icon.sizeDp ?: 22).toFloat()
          setTextColor(icon.color ?: config.iconColor)
          gravity = Gravity.CENTER
          includeFontPadding = false
          typeface = Typeface.create(icon.fontFamily, Typeface.NORMAL)
          layoutParams = LayoutParams(defaultSize, defaultSize)
        }
      }

      "image" -> {
        val uri = icon.uri?.takeIf { it.isNotBlank() } ?: return null
        val width = dp(icon.widthDp ?: icon.sizeDp ?: 24)
        val height = dp(icon.heightDp ?: icon.sizeDp ?: 24)

        ImageView(context).apply {
          layoutParams = LayoutParams(width, height)
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
          textSize = (icon.sizeDp ?: config.titleSizeSp.toInt()).toFloat()
          setTextColor(icon.color ?: config.iconColor)
          gravity = Gravity.CENTER
          includeFontPadding = false
          layoutParams = LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }
      }
    }
  }

  private fun ImageView.applyCornerRadius(radiusDp: Int) {
    if (radiusDp <= 0 || Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return

    clipToOutline = true
    outlineProvider = object : ViewOutlineProvider() {
      override fun getOutline(view: View, outline: Outline) {
        outline.setRoundRect(0, 0, view.width, view.height, dp(radiusDp).toFloat())
      }
    }
  }

  private fun ImageView.loadImageUri(uri: String) {
    when {
      uri.startsWith("http://") || uri.startsWith("https://") -> loadNetworkImage(uri)
      uri.startsWith("asset:/") -> loadAssetImage(uri)
      else -> setImageURI(Uri.parse(uri))
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

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    val constrainedWidthSpec = if (maxWidthPx > 0) {
      MeasureSpec.makeMeasureSpec(maxWidthPx, MeasureSpec.AT_MOST)
    } else {
      widthMeasureSpec
    }
    super.onMeasure(constrainedWidthSpec, heightMeasureSpec)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    announceForAccessibility(contentDescription)
    sendAccessibilityEvent(AccessibilityEvent.TYPE_ANNOUNCEMENT)
    if (config.haptic) vibrateLight()
  }

  fun animateIn() {
    alpha = if (config.animation == "none") 1f else 0f
    when (config.animation) {
      "none" -> return
      "fade" -> animate().alpha(1f).setDuration(140).start()
      "scale" -> {
        scaleX = 0.96f
        scaleY = 0.96f
        animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(180).start()
      }

      else -> {
        translationY = if (config.position == "bottom") dp(12).toFloat() else -dp(12).toFloat()
        animate().alpha(1f).translationY(0f).setDuration(180).start()
      }
    }
  }

  fun animateOut(after: () -> Unit) {
    if (config.animation == "none") {
      after()
      return
    }
    val targetY = when {
      config.animation == "slide" && config.position == "bottom" -> dp(12).toFloat()
      config.animation == "slide" -> -dp(12).toFloat()
      else -> translationY
    }
    animate()
      .alpha(0f)
      .translationY(targetY)
      .setDuration(140)
      .setListener(object : AnimatorListenerAdapter() {
        override fun onAnimationEnd(animation: Animator) {
          animate().setListener(null)
          after()
        }
      })
      .start()
  }

  private fun handleSwipe(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        downY = event.rawY
        downX = event.rawX
        translationStart = translationY
        parent?.requestDisallowInterceptTouchEvent(true)
        return true
      }

      MotionEvent.ACTION_MOVE -> {
        val dy = event.rawY - downY
        val dx = event.rawX - downX
        if (abs(dy) > abs(dx)) {
          val allowed = if (config.position == "bottom") dy.coerceAtLeast(0f) else dy.coerceAtMost(0f)
          translationY = translationStart + allowed
          alpha = (1f - (abs(allowed) / dp(96).toFloat())).coerceIn(0.35f, 1f)
        }
        return true
      }

      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        val shouldDismiss = abs(translationY - translationStart) > dp(40)
        if (shouldDismiss) onDismissRequested() else animate().translationY(0f).alpha(1f).setDuration(120).start()
        parent?.requestDisallowInterceptTouchEvent(false)
        return true
      }
    }
    return false
  }

  private fun vibrateLight() {
    try {
      performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
    } catch (_: Throwable) {
      // Optional haptics must never crash toast rendering.
    }
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
