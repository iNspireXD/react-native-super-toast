package com.supertoast

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.view.View
import kotlin.math.min

/**
 * Draws the built-in state and close icons: Lucide geometry on a 24-unit grid
 * with a 2-unit round stroke. Keep in sync with ios/SuperToastGlyphView.m.
 */
@SuppressLint("ViewConstructor")
internal class ToastGlyphView(
  context: Context,
  glyph: String,
  color: Int,
) : View(context) {
  private val geometry = GEOMETRY[glyph]
  private val path = Path()
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeCap = Paint.Cap.ROUND
    strokeJoin = Paint.Join.ROUND
    strokeWidth = 2f
    this.color = color
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val shape = geometry ?: return

    val contentWidth = width - paddingLeft - paddingRight
    val contentHeight = height - paddingTop - paddingBottom
    val scale = min(contentWidth, contentHeight) / 24f

    canvas.save()
    canvas.translate(
      paddingLeft + (contentWidth - 24f * scale) / 2f,
      paddingTop + (contentHeight - 24f * scale) / 2f,
    )
    canvas.scale(scale, scale)

    shape.circles.forEach { (cx, cy, radius) -> canvas.drawCircle(cx, cy, radius, paint) }
    shape.paths.forEach { points ->
      if (points.size == 2) {
        canvas.drawPoint(points[0], points[1], paint)
      } else {
        path.reset()
        path.moveTo(points[0], points[1])
        for (index in 2 until points.size step 2) {
          path.lineTo(points[index], points[index + 1])
        }
        canvas.drawPath(path, paint)
      }
    }

    canvas.restore()
  }

  private class Geometry(
    val circles: List<Triple<Float, Float, Float>> = emptyList(),
    /** Flattened x/y pairs. A single pair draws a dot. */
    val paths: List<FloatArray>,
  )

  companion object {
    private val circle = listOf(Triple(12f, 12f, 10f))

    private val GEOMETRY = mapOf(
      "success" to Geometry(circle, listOf(floatArrayOf(9f, 12f, 11f, 14f, 15f, 10f))),
      "error" to Geometry(
        circle,
        listOf(floatArrayOf(15f, 9f, 9f, 15f), floatArrayOf(9f, 9f, 15f, 15f)),
      ),
      "warning" to Geometry(
        paths = listOf(
          floatArrayOf(
            12f, 2.6f, 13.73f, 4f, 21.73f, 18f, 22.36f, 20.25f, 20f, 21f,
            4f, 21f, 1.64f, 20.25f, 2.27f, 18f, 10.27f, 4f, 12f, 2.6f,
          ),
          floatArrayOf(12f, 9f, 12f, 13f),
          floatArrayOf(12f, 17f),
        ),
      ),
      "info" to Geometry(circle, listOf(floatArrayOf(12f, 16f, 12f, 12f), floatArrayOf(12f, 8f))),
      "close" to Geometry(
        paths = listOf(floatArrayOf(18f, 6f, 6f, 18f), floatArrayOf(6f, 6f, 18f, 18f)),
      ),
    )
  }
}
