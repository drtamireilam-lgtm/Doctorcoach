import type {WellnessRecord} from './wellness.ts';
import {rehabMeasurementKey,rehabMeasurementLabel} from './rehab-measurements.ts';
// The progress overview spans all regions; the rehabilitation screen pre-filters by region.
export const progressMeasurementKey=(record:WellnessRecord)=>JSON.stringify([record.data.region,rehabMeasurementKey(record)]);
export const progressMeasurementLabel=(record:WellnessRecord,records:WellnessRecord[])=>`${record.data.region} · ${rehabMeasurementLabel(record,records)}`;
