package com.supertoast

import android.graphics.Color
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
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

data class ToastBoxStyle(
  val backgroundColor: Int = Color.TRANSPARENT,
  val borderColor: Int = Color.TRANSPARENT,
  val borderWidthDp: Float = 0f,
  val borderRadiusDp: Float = 0f,
  val paddingHorizontalDp: Float = 0f,
  val paddingVerticalDp: Float = 0f,
)

data class ToastTextStyle(
  val color: Int = Color.BLACK,
  val fontSizeSp: Float = 14f,
  val fontFamily: String? = null,
  val fontWeight: Int = 400,
  val lineHeightSp: Float? = null,
)

data class ToastButtonConfig(
  val label: String,
  val style: ToastBoxStyle,
  val textStyle: ToastTextStyle,
)

/** A toast whose visual values were fully resolved in JS (see resolve.ts). */
data class ToastConfig(
  val id: String,
  val variant: String,
  val title: String,
  val description: String?,
  val icon: ToastIconConfig?,
  val iconColor: Int,
  val durationMs: Long,
  val position: String,
  val dismissible: Boolean,
  val closeButton: Boolean,
  val closeButtonColor: Int,
  val swipeDirection: String,
  val haptic: Boolean,
  val enableStacking: Boolean,
  val expandOnPress: Boolean,
  val visibleToasts: Int,
  val gapDp: Float,
  val offsetDp: Float?,
  val style: ToastBoxStyle,
  val titleStyle: ToastTextStyle,
  val descriptionStyle: ToastTextStyle,
  val action: ToastButtonConfig?,
  val cancel: ToastButtonConfig?,
) {
  companion object {
    fun from(map: ReadableMap): ToastConfig? {
      val id = map.string("id") ?: return null

      return ToastConfig(
        id = id,
        variant = map.string("variant") ?: "default",
        title = map.string("title") ?: "",
        description = map.string("description")?.takeIf { it.isNotBlank() },
        icon = map.icon("icon"),
        iconColor = map.color("iconColor") ?: Color.DKGRAY,
        durationMs = (map.long("duration") ?: 4000L).coerceAtLeast(0L),
        position = map.string("position") ?: "top-center",
        dismissible = map.bool("dismissible") ?: true,
        closeButton = map.bool("closeButton") ?: false,
        closeButtonColor = map.color("closeButtonColor") ?: Color.DKGRAY,
        swipeDirection = map.string("swipeDirection") ?: "up",
        haptic = map.bool("haptic") ?: false,
        enableStacking = map.bool("enableStacking") ?: false,
        expandOnPress = map.bool("expandOnPress") ?: false,
        visibleToasts = (map.int("visibleToasts") ?: 3).coerceAtLeast(1),
        gapDp = map.float("gap") ?: 14f,
        offsetDp = map.float("offset"),
        style = map.map("style").box(),
        titleStyle = map.map("titleStyle").text(),
        descriptionStyle = map.map("descriptionStyle").text(),
        action = map.map("action")?.button(),
        cancel = map.map("cancel")?.button(),
      )
    }
  }
}

private fun ReadableMap.has(key: String): Boolean = hasKey(key) && !isNull(key)

private fun ReadableMap.string(key: String): String? = if (has(key)) getString(key) else null

private fun ReadableMap.bool(key: String): Boolean? = if (has(key)) getBoolean(key) else null

private fun ReadableMap.int(key: String): Int? = if (has(key)) getDouble(key).roundToInt() else null

private fun ReadableMap.long(key: String): Long? = if (has(key)) getDouble(key).roundToLong() else null

private fun ReadableMap.float(key: String): Float? = if (has(key)) getDouble(key).toFloat() else null

private fun ReadableMap.color(key: String): Int? = string(key)?.let { parseColorOrNull(it) }

private fun ReadableMap.map(key: String): ReadableMap? =
  if (has(key) && getType(key) == ReadableType.Map) getMap(key) else null

private fun ReadableMap?.box(): ToastBoxStyle {
  if (this == null) return ToastBoxStyle()

  return ToastBoxStyle(
    backgroundColor = color("backgroundColor") ?: Color.TRANSPARENT,
    borderColor = color("borderColor") ?: Color.TRANSPARENT,
    borderWidthDp = float("borderWidth") ?: 0f,
    borderRadiusDp = float("borderRadius") ?: 0f,
    paddingHorizontalDp = float("paddingHorizontal") ?: 0f,
    paddingVerticalDp = float("paddingVertical") ?: 0f,
  )
}

private fun ReadableMap?.text(): ToastTextStyle {
  if (this == null) return ToastTextStyle()

  return ToastTextStyle(
    color = color("color") ?: Color.BLACK,
    fontSizeSp = float("fontSize") ?: 14f,
    fontFamily = string("fontFamily")?.takeIf { it.isNotBlank() },
    fontWeight = string("fontWeight")?.let { weight ->
      weight.toIntOrNull() ?: if (weight == "bold") 700 else 400
    } ?: 400,
    lineHeightSp = float("lineHeight"),
  )
}

private fun ReadableMap.button(): ToastButtonConfig? {
  val label = string("label") ?: return null
  return ToastButtonConfig(label, map("style").box(), map("textStyle").text())
}

private fun ReadableMap.icon(key: String): ToastIconConfig? {
  if (!has(key)) return null

  return when (getType(key)) {
    ReadableType.String -> ToastIconConfig(type = "text", value = getString(key))
    ReadableType.Map -> {
      val map = getMap(key) ?: return null

      ToastIconConfig(
        type = map.string("type") ?: "text",
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
