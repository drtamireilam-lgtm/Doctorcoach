package com.doctorcoach.mobile

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.ZoneId
import java.time.LocalDate
import java.time.Instant
import java.time.format.DateTimeFormatterBuilder
import org.json.JSONObject
import org.json.JSONArray

class StepsReader(private val context: Context) {
    val permissions = setOf(HealthPermission.getReadPermission(StepsRecord::class))
    fun availability(): String = when (HealthConnectClient.getSdkStatus(context)) {
        HealthConnectClient.SDK_AVAILABLE -> "available"
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "provider-required"
        else -> "unavailable"
    }
    fun available() = availability() == "available"
    private val client by lazy { HealthConnectClient.getOrCreate(context) }
    suspend fun authorized() = client.permissionController.getGrantedPermissions().containsAll(permissions)
    suspend fun readDays(): JSONArray {
        check(authorized())
        val zone = ZoneId.systemDefault(); val today = LocalDate.now(zone); val now = Instant.now()
        val timestamp = DateTimeFormatterBuilder().appendInstant(3).toFormatter()
        val days = JSONArray()
        for (offset in -6L..0L) {
            val day = today.plusDays(offset); val start = day.atStartOfDay(zone).toInstant()
            val end = day.plusDays(1).atStartOfDay(zone).toInstant()
            // Unfiltered platform aggregate applies Health Connect's source priority/deduplication.
            val aggregate = client.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), TimeRangeFilter.between(start, minOf(end, now))))
            val count = aggregate[StepsRecord.COUNT_TOTAL]
            days.put(JSONObject().put("date", day.toString()).put("timezone", zone.id)
                .put("startAt", timestamp.format(start)).put("endAt", timestamp.format(end))
                .put("steps", count ?: JSONObject.NULL).put("observedAt", timestamp.format(now)).put("partial", end > now)
                .put("method", "health_connect_aggregate")
                .put("provenance", JSONArray().put("health-connect:platform-aggregate")))
        }
        return days
    }
}
