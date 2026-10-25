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
import org.json.JSONObject
import org.json.JSONArray

class StepsReader(private val context: Context) {
    val permissions = setOf(HealthPermission.getReadPermission(StepsRecord::class))
    fun available() = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
    private val client by lazy { HealthConnectClient.getOrCreate(context) }
    suspend fun authorized() = client.permissionController.getGrantedPermissions().containsAll(permissions)
    suspend fun readDays(): JSONArray {
        check(authorized())
        val zone = ZoneId.systemDefault(); val today = LocalDate.now(zone); val now = Instant.now()
        val days = JSONArray()
        for (offset in -6L..0L) {
            val day = today.plusDays(offset); val start = day.atStartOfDay(zone).toInstant()
            val end = day.plusDays(1).atStartOfDay(zone).toInstant()
            // Unfiltered platform aggregate applies Health Connect's source priority/deduplication.
            val aggregate = client.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), TimeRangeFilter.between(start, minOf(end, now))))
            val count = aggregate[StepsRecord.COUNT_TOTAL]
            days.put(JSONObject().put("date", day.toString()).put("timezone", zone.id)
                .put("startAt", start.toString()).put("endAt", end.toString())
                .put("steps", count ?: JSONObject.NULL).put("observedAt", now.toString()).put("partial", true)
                .put("method", "health_connect_aggregate")
                .put("provenance", JSONArray().put("health-connect:platform-aggregate")))
        }
        return days
    }
}
