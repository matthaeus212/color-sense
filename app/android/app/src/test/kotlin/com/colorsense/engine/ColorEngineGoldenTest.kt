// 골든 케이스 회귀 — frontend/spec/color-engine.json 을 app/src/test/resources/color-engine.json 으로 복사해 둔다 (npm run golden 후 갱신).
package com.colorsense.engine

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class ColorEngineGoldenTest {
    @Serializable data class Spec(val cases: List<Case>)
    @Serializable data class Case(val id: String, val tempC: Double, val isDay: Int, val wx: WeatherComposition, val stops: List<List<Int>>)

    private val json = Json { ignoreUnknownKeys = true }

    @Test fun goldenCasesMatchWebWithinOne() {
        val text = javaClass.getResource("/color-engine.json")!!.readText()
        val spec = json.decodeFromString(Spec.serializer(), text)
        assertTrue(spec.cases.size >= 150)
        for (c in spec.cases) {
            val out = ColorEngine.skyStops(c.tempC, c.wx, c.isDay == 1)
            for (i in 0 until 6) for (k in 0 until 3)
                assertTrue(abs(out[i][k] - c.stops[i][k]) <= 1, "${c.id} stop$i ch$k: ${out[i][k]} vs ${c.stops[i][k]}")
        }
    }

    @Test fun subZeroDiffersFromZero() {
        val clear = WeatherComposition()
        assertNotEquals(ColorEngine.skyStops(-15.0, clear, true).map { it.toList() }, ColorEngine.skyStops(0.0, clear, true).map { it.toList() })
    }
}
