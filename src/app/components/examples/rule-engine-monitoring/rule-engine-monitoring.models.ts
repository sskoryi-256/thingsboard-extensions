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
  maxDurationMs: number | null;
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
  maxDurationMs: number | null;
  p95DurationMs: number | null;
}

// Matches backend QueueTimeseriesEntry JSON fields
export interface QueueTsEntry {
  bucketTime: number;
  timeoutCount: number | null;
}

// Matches backend QueueLagTimeseriesEntry JSON fields (queueTenantId/queueId are null when not grouped)
export interface QueueLagTsEntry {
  bucketTime: number;
  lag: number | null;
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
  maxDurationMs:   number | null;
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
  maxDurationMs:   MetricDelta;
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
  maxDurationMs: number | null;
  p95DurationMs: number | null;
  timeoutCount: number | null;
}

export type ComparisonColour = 'green' | 'red' | 'neutral';

export interface ComparisonLabel {
  delta: number | null;
  colour: ComparisonColour;
}

// ── Trace path statistics (execution paths) ─────────────────────────────────────
// Matches the trace stats API response (see openspec/api.json).

export interface TracePathRef {
  id: string;
  name: string;
}

// Path-level aggregated trace metrics
export interface TracePathMetrics {
  traceCount: number;
  successTraceCount: number;
  failedTraceCount: number;
  timeoutTraceCount: number;
  successRate: number;            // 0..1
  avgTraceDurationMs: number;
  maxTraceDurationMs: number;
  p95TraceDurationMs: number;
  totalTraceDurationMs: number;
}

export interface TracePathGraphNode {
  id: string;
  name: string;
  type: string;
  ruleChainId?: string;
  ruleChainName?: string;
  queueId?: string;
  queueName?: string;
}

export interface TracePathGraphEdge {
  from: string;
  to: string;
  relation: string;
}

export interface TracePathGraph {
  rootNodeId: string;
  nodes: TracePathGraphNode[];
  edges: TracePathGraphEdge[];
}

// Per-rule-node metrics within a single path
export interface TraceRuleNodeMetric {
  ruleNodeId: string;
  ruleNodeName: string;
  ruleNodeType: string;
  ruleChainId?: string;
  ruleChainName?: string;
  executionCount: number;
  failedExecutionCount: number;
  timeoutCount: number;
  avgDurationMs: number;
  maxDurationMs: number;
  p95DurationMs: number;
  totalDurationMs: number;
}

export interface TracePath {
  pathId: string;
  pathHash: string;
  name: string;
  messageType: string;
  queue: TracePathRef;
  ruleChain: TracePathRef;
  metrics: TracePathMetrics;
  pathGraph: TracePathGraph;
  ruleNodeMetrics: TraceRuleNodeMetric[];
}

export interface TraceStatsSummary {
  totalTraceCount: number;
  totalExecutionCount: number;
  avgTraceDurationMs: number;
  maxTraceDurationMs: number;
  successRate: number;
  errorTraceCount: number;
  timeoutTraceCount: number;
}

export interface TracePageInfo {
  page: number;
  pageSize: number;
  totalElements: number;
}

export interface TraceStatsResponse {
  fromTs: number;
  toTs: number;
  interval: string;
  page: TracePageInfo;
  summary: TraceStatsSummary;
  paths: TracePath[];
}

// Tracing configuration shown/edited in the Trace Settings drawer
export interface TraceSettings {
  enabled: boolean;
  tracesPerInterval: number;        // max traces collected per interval
  interval: number;                 // collection interval, seconds
  ruleEngineSwitchInterval: number; // how often tracing rotates to another rule engine, seconds
}

// ── Individual traces (global Traces view + shared Trace Details) ───────────────

export type TraceStatus = 'success' | 'failed' | 'timeout';

// A single trace as shown in the global Traces list.
export interface TraceListItem {
  traceId: string;
  startTs: number;          // trace start time (epoch ms)
  endTs: number;            // trace end time (epoch ms)
  durationMs: number;       // total (wall-clock) trace duration
  inQueueTimeMs: number;    // time spent waiting in queue(s)
  totalSpanTimeMs: number;  // cumulative active span (processing) time
  status: TraceStatus;
  withTimeout: boolean;
  withErrors: boolean;
  queueId: string;
  queueName: string;        // root queue
  messageType: string;      // root message type
  ruleChainId: string;
  ruleChainName: string;    // root rule chain
  serviceCount: number;     // distinct rule-engine services touched
  queueCount: number;       // distinct queues touched
  ruleChainCount: number;   // distinct rule chains touched
  ruleNodeCount: number;    // distinct rule nodes touched
  // distinct entities the trace touches (for the Traces filters; "contains at least one such span")
  services: string[];
  queues: string[];
  ruleChains: string[];
  ruleNodes: string[];
  pathId: string;           // execution path this trace belongs to
  pathName: string;
}

// A span (rule-node hop) in a trace's waterfall. Structurally matches the graph node used by the
// execution-paths timeline; see trace-graph.util.ts.
export interface TraceSpan {
  spanId: string;
  name: string;
  type: string;             // short rule-node type
  ruleChain: string;
  serviceId: string;        // rule engine instance, e.g. "rule-engine-0"
  relation: string | null;  // label on the edge into this span (null at root)
  startMs: number;          // relative to trace start
  durationMs: number;
  error: boolean;
  children: TraceSpan[];
}

// Full trace detail: the list item plus the resolved span tree.
export interface TraceDetail extends TraceListItem {
  spans: TraceSpan[];       // root spans (tree)
}

// Reference to an execution path used as a Traces-view filter (set from Path Details "View traces").
export interface ExecutionPathRef {
  pathId: string;
  label: string;            // e.g. "HighPriority / ALARM / Root Rule Chain"
}

// Filter model for the global Traces list. null/false = unset. Combined with AND.
export interface TraceFilters {
  ruleEngine: string | null;   // trace touches this rule-engine service
  queue: string | null;        // trace touches this queue
  ruleChain: string | null;    // trace has at least one span in this rule chain
  ruleNode: string | null;     // trace has at least one span in this rule node
  withTimeout: boolean;        // trace has at least one timed-out span
  withError: boolean;          // trace has at least one failed span
  pathId: string | null;       // set from Execution Paths "View traces"
}

export function emptyTraceFilters(): TraceFilters {
  return {
    ruleEngine: null, queue: null, ruleChain: null, ruleNode: null,
    withTimeout: false, withError: false, pathId: null,
  };
}
