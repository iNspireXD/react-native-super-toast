package com.supertoast

import android.graphics.Color
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import java.util.UUID
import kotlin.math.roundToInt
import kotlin.math.roundToLong

data class ToastIconConfig(
  val type: String = "text",
  val value: String? = null,
  val glyph: String? = null,
  val fontFamily: String? = null,
  val uri: String? = null,
  val widthDp: Int? = null,
  val heightDp: Int? = null,
  val sizeDp: Int? = null,
  val color: Int? = null,
  val tintColor: Int? = null,
  val cornerRadiusDp: Int = 0,
)

data class ToastConfig(
  val id: String = UUID.randomUUID().toString(),
  val kind: String = "default",
  val title: String? = null,
  val message: String? = null,
  val icon: ToastIconConfig? = null,
  val durationMs: Long = 3000,
  val position: String = "top",
  val widthMode: String = "content",
  val animation: String = "slide",
  val topOffsetDp: Int = 48,
  val bottomOffsetDp: Int = 48,
  val maxWidthDp: Int = 420,
  val horizontalMarginDp: Int = 16,
  val backgroundColor: Int = Color.rgb(31, 41, 55),
  val titleColor: Int = Color.WHITE,
  val messageColor: Int = Color.WHITE,
  val iconColor: Int = Color.WHITE,
  val borderColor: Int = Color.TRANSPARENT,
  val borderWidthDp: Int = 0,
  val borderRadiusDp: Int = 14,
  val paddingHorizontalDp: Int = 16,
  val paddingVerticalDp: Int = 12,
  val gapDp: Int = 8,
  val titleSizeSp: Float = 15f,
  val messageSizeSp: Float = 14f,
  val elevationDp: Int = 8,
  val shadowOpacity: Float = 0.18f,
  val swipeToDismiss: Boolean = true,
  val closeOnPress: Boolean = false,
  val haptic: Boolean = false,
  val queue: Boolean = true,
) {
  companion object {
    fun from(map: ReadableMap, defaults: ToastConfig): ToastConfig {
      val kind = map.string("kind") ?: defaults.kind
      val palette = paletteFor(kind)

      return defaults.copy(
        id = map.string("id") ?: UUID.randomUUID().toString(),
        kind = kind,
        title = map.string("title"),
        message = map.string("message"),
        icon = map.icon("icon") ?: defaults.icon,
        durationMs = map.long("duration") ?: defaults.durationMs,
        position = map.string("position") ?: defaults.position,
        widthMode = map.string("widthMode") ?: defaults.widthMode,
        animation = map.string("animation") ?: defaults.animation,
        topOffsetDp = map.int("topOffset") ?: defaults.topOffsetDp,
        bottomOffsetDp = map.int("bottomOffset") ?: defaults.bottomOffsetDp,
        maxWidthDp = map.int("maxWidth") ?: defaults.maxWidthDp,
        horizontalMarginDp = map.int("horizontalMargin") ?: defaults.horizontalMarginDp,
        backgroundColor = map.color("backgroundColor") ?: palette.first,
        titleColor = map.color("titleColor") ?: defaults.titleColor,
        messageColor = map.color("messageColor") ?: defaults.messageColor,
        iconColor = map.color("iconColor") ?: palette.second,
        borderColor = map.color("borderColor") ?: defaults.borderColor,
        borderWidthDp = map.int("borderWidth") ?: defaults.borderWidthDp,
        borderRadiusDp = map.int("borderRadius") ?: defaults.borderRadiusDp,
        paddingHorizontalDp = map.int("paddingHorizontal") ?: defaults.paddingHorizontalDp,
        paddingVerticalDp = map.int("paddingVertical") ?: defaults.paddingVerticalDp,
        gapDp = map.int("gap") ?: defaults.gapDp,
        titleSizeSp = map.float("titleSize") ?: defaults.titleSizeSp,
        messageSizeSp = map.float("messageSize") ?: defaults.messageSizeSp,
        elevationDp = map.int("elevation") ?: defaults.elevationDp,
        shadowOpacity = map.float("shadowOpacity") ?: defaults.shadowOpacity,
        swipeToDismiss = map.bool("swipeToDismiss") ?: defaults.swipeToDismiss,
        closeOnPress = map.bool("closeOnPress") ?: defaults.closeOnPress,
        haptic = map.bool("haptic") ?: defaults.haptic,
        queue = map.bool("queue") ?: defaults.queue,
      )
    }

    fun update(map: ReadableMap, current: ToastConfig): ToastConfig {
      val kind = map.string("kind") ?: current.kind
      val kindChanged = kind != current.kind
      val palette = paletteFor(kind)

      return current.copy(
        id = current.id,
        kind = kind,
        title = if (map.hasKey("title")) map.string("title") else current.title,
        message = if (map.hasKey("message")) map.string("message") else current.message,
        icon = when {
          map.hasKey("icon") -> map.icon("icon")
          kindChanged -> null
          else -> current.icon
        },
        durationMs = map.long("duration") ?: current.durationMs,
        position = map.string("position") ?: current.position,
        widthMode = map.string("widthMode") ?: current.widthMode,
        animation = map.string("animation") ?: current.animation,
        topOffsetDp = map.int("topOffset") ?: current.topOffsetDp,
        bottomOffsetDp = map.int("bottomOffset") ?: current.bottomOffsetDp,
        maxWidthDp = map.int("maxWidth") ?: current.maxWidthDp,
        horizontalMarginDp = map.int("horizontalMargin") ?: current.horizontalMarginDp,
        backgroundColor = map.color("backgroundColor")
          ?: if (kindChanged) palette.first else current.backgroundColor,
        titleColor = map.color("titleColor") ?: current.titleColor,
        messageColor = map.color("messageColor") ?: current.messageColor,
        iconColor = map.color("iconColor")
          ?: if (kindChanged) palette.second else current.iconColor,
        borderColor = map.color("borderColor") ?: current.borderColor,
        borderWidthDp = map.int("borderWidth") ?: current.borderWidthDp,
        borderRadiusDp = map.int("borderRadius") ?: current.borderRadiusDp,
        paddingHorizontalDp = map.int("paddingHorizontal") ?: current.paddingHorizontalDp,
        paddingVerticalDp = map.int("paddingVertical") ?: current.paddingVerticalDp,
        gapDp = map.int("gap") ?: current.gapDp,
        titleSizeSp = map.float("titleSize") ?: current.titleSizeSp,
        messageSizeSp = map.float("messageSize") ?: current.messageSizeSp,
        elevationDp = map.int("elevation") ?: current.elevationDp,
        shadowOpacity = map.float("shadowOpacity") ?: current.shadowOpacity,
        swipeToDismiss = map.bool("swipeToDismiss") ?: current.swipeToDismiss,
        closeOnPress = map.bool("closeOnPress") ?: current.closeOnPress,
        haptic = map.bool("haptic") ?: current.haptic,
        queue = current.queue,
      )
    }

    private fun paletteFor(kind: String): Pair<Int, Int> = when (kind) {
      "success" -> Color.rgb(22, 101, 52) to Color.rgb(187, 247, 208)
      "error" -> Color.rgb(127, 29, 29) to Color.rgb(254, 202, 202)
      "warning" -> Color.rgb(113, 63, 18) to Color.rgb(254, 240, 138)
      "info" -> Color.rgb(30, 64, 175) to Color.rgb(191, 219, 254)
      "loading" -> Color.rgb(63, 63, 70) to Color.WHITE
      else -> Color.rgb(31, 41, 55) to Color.WHITE
    }
  }
}

private fun ReadableMap.string(key: String): String? = if (hasKey(key) && !isNull(key)) getString(key) else null
private fun ReadableMap.bool(key: String): Boolean? = if (hasKey(key) && !isNull(key)) getBoolean(key) else null
private fun ReadableMap.int(key: String): Int? = if (hasKey(key) && !isNull(key)) getDouble(key).roundToInt() else null
private fun ReadableMap.long(key: String): Long? =
  if (hasKey(key) && !isNull(key)) getDouble(key).roundToLong() else null

private fun ReadableMap.float(key: String): Float? = if (hasKey(key) && !isNull(key)) getDouble(key).toFloat() else null
private fun ReadableMap.color(key: String): Int? = string(key)?.let { parseColorOrNull(it) }

private fun ReadableMap.icon(key: String): ToastIconConfig? {
  if (!hasKey(key) || isNull(key)) return null

  return when (getType(key)) {
    ReadableType.String -> ToastIconConfig(type = "text", value = getString(key))
    ReadableType.Map -> {
      val map = getMap(key) ?: return null
      val type = map.string("type") ?: "text"

      ToastIconConfig(
        type = type,
        value = map.string("value"),
        glyph = map.string("glyph"),
        fontFamily = map.string("fontFamily"),
        uri = map.string("uri"),
        widthDp = map.int("width"),
        heightDp = map.int("height"),
        sizeDp = map.int("size"),
        color = map.color("color"),
        tintColor = map.color("tintColor"),
        cornerRadiusDp = map.int("cornerRadius") ?: 0,
      )
    }

    else -> null
  }
}

private fun parseColorOrNull(value: String): Int? = try {
  Color.parseColor(value)
} catch (_: IllegalArgumentException) {
  null
}
