// 공통 날씨 모델 — backend/api-contract.md §2 와 1:1. kotlinx.serialization 으로 BFF JSON 을 그대로 디코딩한다.
package com.colorsense.engine

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Precip { @SerialName("none") NONE, @SerialName("rain") RAIN, @SerialName("drizzle") DRIZZLE, @SerialName("snow") SNOW, @SerialName("sleet") SLEET, @SerialName("showers") SHOWERS }

@Serializable
data class WeatherComposition(
    val sky: Int = 0,               // 0 맑음 · 1 구름조금 · 2 구름많음 · 3 흐림
    val precip: Precip = Precip.NONE,
    val inten: Int = 2,             // 1 약 · 2 보통 · 3 강
    val fog: Boolean = false,
    val storm: Boolean = false,
    val dust: Int = 0,              // 0 · 1 미세먼지 · 2 황사
) {
    val isWet get() = precip == Precip.RAIN || precip == Precip.SHOWERS || precip == Precip.DRIZZLE || precip == Precip.SLEET
    val isSnowy get() = precip == Precip.SNOW || precip == Precip.SLEET
}

enum class DataState { FRESH, STALE, DELAYED, OFFLINE }

/** updatedAt / nextUpdateAt (epoch ms) → 데이터 상태. frontend/src/lib/model.js dataState 와 동일 규칙. */
fun dataState(updatedAtMs: Long?, nextUpdateAtMs: Long?, nowMs: Long = System.currentTimeMillis(), online: Boolean = true): DataState {
    if (!online) return DataState.OFFLINE
    if (updatedAtMs == null) return DataState.DELAYED
    if (nowMs - updatedAtMs > 3 * 3600_000L) return DataState.DELAYED
    if (nextUpdateAtMs != null && nowMs - nextUpdateAtMs > 30 * 60_000L) return DataState.STALE
    return DataState.FRESH
}
