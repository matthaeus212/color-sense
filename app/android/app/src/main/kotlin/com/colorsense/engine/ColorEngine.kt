// 컬러 엔진 — frontend/src/lib/color.js skyStops() 의 1:1 이식.
// 규칙과 앵커는 design/color-engine-spec.md. 골든 테스트(ColorEngineGoldenTest)가 웹과 ±1 일치를 보장한다.
package com.colorsense.engine

import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

object ColorEngine {
    val positions = floatArrayOf(0f, 0.30f, 0.52f, 0.70f, 0.84f, 1.0f)

    private class Anchor(val t: Double, val s: List<DoubleArray>)
    private fun rgb(vararg v: Int) = DoubleArray(3) { v[it].toDouble() }
    private val anchors = listOf(
        Anchor(-15.0, listOf(rgb(8,12,40), rgb(16,36,84), rgb(40,80,132), rgb(96,140,176), rgb(196,200,206), rgb(130,140,168))),
        Anchor(0.0,   listOf(rgb(12,20,52), rgb(26,52,104), rgb(58,104,158), rgb(120,168,196), rgb(214,206,196), rgb(150,150,170))),
        Anchor(10.0,  listOf(rgb(12,24,60), rgb(26,64,120), rgb(58,120,168), rgb(140,186,198), rgb(238,206,160), rgb(206,160,120))),
        Anchor(19.0,  listOf(rgb(12,26,66), rgb(24,72,128), rgb(58,132,172), rgb(176,206,196), rgb(246,204,140), rgb(236,150,80))),
        Anchor(27.0,  listOf(rgb(26,30,74), rgb(40,78,134), rgb(120,158,176), rgb(240,200,150), rgb(246,150,78), rgb(226,104,54))),
        Anchor(36.0,  listOf(rgb(46,34,82), rgb(96,80,138), rgb(200,150,150), rgb(250,180,120), rgb(245,120,64), rgb(216,58,44))),
    )

    private fun lerp(a: Double, b: Double, r: Double) = a + (b - a) * r
    private fun mix(a: DoubleArray, b: DoubleArray, r: Double) = DoubleArray(3) { a[it] + (b[it] - a[it]) * r }
    private fun grey(c: DoubleArray): DoubleArray { val l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; return doubleArrayOf(l, l, l) }
    private fun scale(c: DoubleArray, f: Double) = DoubleArray(3) { c[it] * f }

    private fun buildStops(tempC: Double): List<DoubleArray> {
        val t = max(-15.0, min(36.0, tempC))
        for (i in 0 until anchors.size - 1) {
            val a = anchors[i]; val b = anchors[i + 1]
            if (t >= a.t && t <= b.t) {
                val r = (t - a.t) / (b.t - a.t)
                return a.s.mapIndexed { k, c -> DoubleArray(3) { j -> lerp(c[j], b.s[k][j], r) } }
            }
        }
        return anchors.last().s
    }

    /** 6개 스톱(top→bottom)의 정수 RGB. 계절 입력은 없다(D4). */
    fun skyStops(tempC: Double?, wx: WeatherComposition, isDay: Boolean): List<IntArray> {
        var s = buildStops(tempC ?: 15.0)
        val sky = wx.sky.coerceIn(0, 3)
        val mute = doubleArrayOf(0.0, 0.06, 0.18, 0.34)[sky]
        val dk = doubleArrayOf(1.0, 0.98, 0.95, 0.9)[sky]
        if (mute > 0) s = s.map { scale(mix(it, grey(it), mute), dk) }
        if (wx.isWet) { val f = if (wx.precip == Precip.DRIZZLE) 0.78 else 0.68; s = s.map { scale(mix(it, grey(it), 0.3), f) } }
        if (wx.isSnowy) s = s.mapIndexed { i, c -> mix(c, doubleArrayOf(255.0, 255.0, 255.0), if (i < 3) 0.16 else 0.3) }
        if (wx.fog) s = s.map { scale(mix(it, grey(it), 0.5), 0.92) }
        if (wx.storm) s = s.map { scale(it, 0.78) }
        if (wx.dust > 0) {
            val amt = if (wx.dust == 2) 0.44 else 0.26
            s = s.map { scale(mix(mix(it, grey(it), 0.28), doubleArrayOf(198.0, 168.0, 112.0), amt), 0.95) }
        }
        if (!isDay) {
            val nf = doubleArrayOf(0.4, 0.45, 0.5, 0.55, 0.64, 0.6)
            s = s.mapIndexed { i, c -> scale(mix(c, grey(c), 0.22), nf[i]) }
        }
        return s.map { c -> IntArray(3) { max(0.0, min(255.0, c[it])).roundToInt() } }
    }

    /** Compose 용 ARGB 정수 스톱. 사용: Brush.verticalGradient(colorStops = stops.mapIndexed { i, c -> positions[i] to Color(c) }.toTypedArray()) */
    fun argbStops(tempC: Double?, wx: WeatherComposition, isDay: Boolean): IntArray =
        skyStops(tempC, wx, isDay).map { (0xFF shl 24) or (it[0] shl 16) or (it[1] shl 8) or it[2] }.toIntArray()
}
