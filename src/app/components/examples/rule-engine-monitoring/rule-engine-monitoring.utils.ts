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
  return `${(ms / 60_000).toFixed(1)} min`;
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
