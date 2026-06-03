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

export interface QueueOption {
  id: string;
  name: string;
  tenantId: string | null;
}

export interface RuleChainOption {
  id: string;
  name: string;
}

export interface RuleNodeOption {
  id: string;
  name: string;
  ruleChainId: string;
  ruleChainName: string;
}

export interface FilterOptions {
  queues: QueueOption[];
  ruleChains: RuleChainOption[];
  ruleNodes: RuleNodeOption[];
  serviceIds: string[];
}

export interface FilterState {
  startTs: number;
  endTs: number;
  queueIds: string[];
  ruleChainIds: string[];
  ruleNodeIds: string[];
  serviceIds: string[];
}

export interface TimeRange {
  startTs: number;
  endTs: number;
}

export interface CompareState {
  baseRange: TimeRange | null;  // null = compare mode on but no range selected yet
  compareRange: TimeRange | null;
}

// Matches backend RuleNodeTableRow JSON fields
export interface NodeStatsRow {
  execCount: number | null;
  errorCount: number | null;
  totalDurationMs: number | null;
  avgDurationMs: number | null;
  p95DurationMs: number | null;
  tenantId: string | null;
  serviceId: string | null;
  queueId: string | null;
  ruleChainId: string | null;
  ruleNodeId: string | null;
}

// Matches backend QueueTableEntry JSON fields
export interface QueueStatsRow {
  timeoutCount: number | null;
  failureCount: number | null;
  successCount: number | null;
  tenantId: string | null;
  serviceId: string | null;
  queueId: string | null;
  ruleChainId: string | null;
  ruleNodeId: string | null;
  queueTenantId: string | null;
}

// Matches backend RuleNodeTsKvEntry JSON fields; bucketTime is the interval start timestamp
export interface NodeTsEntry {
  bucketTime: number;
  execCount: number | null;
  errorCount: number | null;
  totalDurationMs: number | null;
  avgDurationMs: number | null;
  p95DurationMs: number | null;
}

// Matches backend QueueTimeseriesEntry JSON fields
export interface QueueTsEntry {
  bucketTime: number;
  timeoutCount: number | null;
}

// Matches backend MergedStatsTableRow JSON
export interface MergedStatsTableRow {
  queueId:         string | null;
  ruleChainId:     string | null;
  ruleNodeId:      string | null;
  serviceId:       string | null;
  execCount:       number | null;
  errorCount:      number | null;
  totalDurationMs: number | null;
  avgDurationMs:   number | null;
  p95DurationMs:   number | null;
  timeoutCount:    number | null;
}

// Matches backend MetricDelta JSON.
// deltaPercent=null is ambiguous — the frontend must inspect baseValue/compareValue first:
//   baseValue=null             → "New"     (entity absent from base window)
//   compareValue=null          → "Missing" (entity absent from compare window)
//   both null                  → "N/A"     (metric absent in both windows)
//   baseValue=0, compareValue=0→ "0%"      (both zero, neutral)
//   baseValue=0                → "New"     (can't divide by zero)
//   deltaPercent=null (else)   → "~"       (change < 1%, negligible)
export interface MetricDelta {
  baseValue:    number | null;
  compareValue: number | null;
  deltaValue:   number | null;
  deltaPercent: number | null;
}

// Matches backend MergedStatsDelta JSON
export interface MergedStatsDelta {
  queueId:         string | null;
  ruleChainId:     string | null;
  ruleNodeId:      string | null;
  serviceId:       string | null;
  execCount:       MetricDelta;
  errorCount:      MetricDelta;
  totalDurationMs: MetricDelta;
  avgDurationMs:   MetricDelta;
  p95DurationMs:   MetricDelta;
  timeoutCount:    MetricDelta;
}

// Merged view row: dimension names resolved from FilterOptions client-side
export interface MergedTableRow {
  queueId: string | null;
  queueName: string | null;
  ruleChainId: string | null;
  ruleChainName: string | null;
  ruleNodeId: string | null;
  ruleNodeName: string | null;
  serviceId: string | null;
  execCount: number | null;
  errorCount: number | null;
  avgDurationMs: number | null;
  totalDurationMs: number | null;
  p95DurationMs: number | null;
  timeoutCount: number | null;
}

export type ComparisonColour = 'green' | 'red' | 'neutral';

export interface ComparisonLabel {
  delta: number | null;
  colour: ComparisonColour;
}
