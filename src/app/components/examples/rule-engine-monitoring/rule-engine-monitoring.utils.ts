///
/// ThingsBoard, Inc. ("COMPANY") CONFIDENTIAL
///
/// Copyright © 2016-2026 ThingsBoard, Inc. All Rights Reserved.
///
/// NOTICE: All information contained herein is, and remains
/// the property of ThingsBoard, Inc. and its suppliers,
/// if any.  The intellectual and technical concepts contained
/// herein are proprietary to ThingsBoard, Inc.
/// and its suppliers and may be covered by U.S. and Foreign Patents,
/// patents in process, and are protected by trade secret or copyright law.
///
/// Dissemination of this information or reproduction of this material is strictly forbidden
/// unless prior written permission is obtained from COMPANY.
///
/// Access to the source code contained herein is hereby forbidden to anyone except current COMPANY employees,
/// managers or contractors who have executed Confidentiality and Non-disclosure agreements
/// explicitly covering such access.
///
/// The copyright notice above does not evidence any actual or intended publication
/// or disclosure  of  this source code, which includes
/// information that is confidential and/or proprietary, and is a trade secret, of  COMPANY.
/// ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
/// OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT
/// THE EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED,
/// AND IN VIOLATION OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.
/// THE RECEIPT OR POSSESSION OF THIS SOURCE CODE AND/OR RELATED INFORMATION
/// DOES NOT CONVEY OR IMPLY ANY RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS,
/// OR TO MANUFACTURE, USE, OR SELL ANYTHING THAT IT  MAY DESCRIBE, IN WHOLE OR IN PART.
///

import { ComparisonLabel } from './rule-engine-monitoring.models';

export function formatAvgDuration(ms: number | null): string {
  if (ms === null || ms === undefined) { return '—'; }
  return ms === 0 ? '< 1 ms' : `${Math.round(ms)} ms`;
}

export function formatDuration(ms: number): string {
  if (ms === null || ms === undefined) {
    return '0 ms';
  }
  if (ms < 1000) {
    return `${ms} ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)} s`;
  }
  if (ms < 3_600_000) {
    return `${(ms / 60_000).toFixed(1)} min`;
  }
  return `${(ms / 3_600_000).toFixed(1)} h`;
}

/** Compact number formatting for the inspector: 1,200,000 → "1.2M", 18,900 → "18.9K", 134,000 → "134K". */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const strip = (x: number) => x.toFixed(1).replace(/\.0$/, '');
  if (abs >= 1e9) return `${strip(n / 1e9)}B`;
  if (abs >= 1e6) return `${strip(n / 1e6)}M`;
  if (abs >= 1e3) return `${strip(n / 1e3)}K`;
  return Math.round(n).toLocaleString('en-US');
}

export function computeDelta(current: number, comparison: number): number | null {
  if (!comparison) {
    return null;
  }
  const delta = (current - comparison) / comparison * 100;
  return Math.abs(delta) < 1 ? null : delta;
}

export function comparisonLabel(delta: number | null, lowerIsBetter: boolean): ComparisonLabel {
  if (delta === null) {
    return { delta: null, colour: 'neutral' };
  }
  const positive = delta > 0;
  const improved = lowerIsBetter ? !positive : positive;
  return { delta, colour: improved ? 'green' : 'red' };
}

export function buildGroupByParam(dims: string[]): string {
  return dims.join(',');
}

export interface SparsePoint {
  bucketTime: number;
  value: number;
}

export type FillMode = 'zero' | 'null';

/**
 * Converts a sparse time-series (only buckets where something happened) into a dense
 * series covering every expected bucket in [startTs, endTs). Missing buckets are filled
 * with 0 ('zero' mode — count/sum/gauge metrics) or null ('null' mode — duration metrics
 * that have no meaning when no executions happened).
 *
 * The grid is aligned to multiples of intervalMs to match the backend bucket boundaries
 * computed as (bucket_time / intervalMs) * intervalMs.
 */
export function densifyTimeSeries(
  points: SparsePoint[],
  startTs: number,
  endTs: number,
  intervalMs: number,
  fillMode: FillMode
): [number, number | null][] {
  const valuesByBucket = new Map<number, number>();
  for (const point of points) {
    valuesByBucket.set(point.bucketTime, point.value);
  }

  const fill = fillMode === 'zero' ? 0 : null;
  const alignedStart = Math.floor(startTs / intervalMs) * intervalMs;

  const result: [number, number | null][] = [];
  for (let bucket = alignedStart; bucket < endTs; bucket += intervalMs) {
    result.push([bucket, valuesByBucket.get(bucket) ?? fill]);
  }
  return result;
}

// true = lower is better, false = higher is better
export const METRIC_POLARITY: Record<string, boolean> = {
  totalFailedExecs: true,
  avgDuration: true,
  totalProcessingTime: true,
  queueTimeoutCount: true,
  successRate: false,
  totalExecs: false,
  execCount: false,
};
