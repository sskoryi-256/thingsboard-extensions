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

import { TRACE_STATS_MOCK } from './execution-paths.mock';
import { TraceDetail, TraceListItem, TracePath, TraceSpan, TraceStatus } from './rule-engine-monitoring.models';
import { assignTiming, buildGraphTree, markLastError, pruneTree, serviceIndex } from './trace-graph.util';

// Flat list of individual (mock) traces derived from the execution-path mock, so each trace's
// queue / message type / rule chain / execution path stays consistent with the Execution Paths view.
// Deterministic: same dataset on every load. Served until the real trace-list endpoint is wired up.

const FROM_TS = TRACE_STATS_MOCK.fromTs;
const TO_TS = TRACE_STATS_MOCK.toTs;
const MAX_PER_PATH = 40;   // ~140 paths × up to 40 ≈ several thousand traces (exercises pagination)

interface MockTraceEntry {
  item: TraceListItem;
  path: TracePath;
  status: TraceStatus;
}

export function pathLabel(p: { queue?: { name: string }; messageType: string; ruleChain?: { name: string } }): string {
  return `${p.queue?.name ?? '—'} / ${p.messageType} / ${p.ruleChain?.name ?? 'Unknown Rule Chain'}`;
}

function distinct(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

/** Rule-node display label without the per-instance numeric suffix, e.g. "Save Timeseries 3" → "Save Timeseries",
 *  so the Rule Node filter groups by node kind rather than listing every instance. */
function nodeLabel(name: string): string {
  return name.replace(/\s+\d+$/, '');
}

function buildEntries(): MockTraceEntry[] {
  const entries: MockTraceEntry[] = [];
  const window = Math.max(0, TO_TS - FROM_TS);
  for (const p of TRACE_STATS_MOCK.paths) {
    const count = Math.max(1, Math.min(p.metrics.traceCount, MAX_PER_PATH));
    const failRatio = p.metrics.traceCount ? p.metrics.failedTraceCount / p.metrics.traceCount : 0;
    const base = p.metrics.avgTraceDurationMs || 20;
    const spread = Math.max(1, p.metrics.p95TraceDurationMs - base + 1);

    // Structural sets are a property of the path's graph (same for every trace of the path), so
    // compute once per path and share the array references across its traces.
    const nodes = p.pathGraph?.nodes ?? [];
    const services = distinct(nodes.map(n => `rule-engine-${serviceIndex(n.id)}`));
    const queues = distinct(nodes.map(n => n.queueName).filter(Boolean) as string[]);
    const ruleChains = distinct(nodes.map(n => n.ruleChainName).filter(Boolean) as string[]);
    const ruleNodes = distinct(nodes.map(n => nodeLabel(n.name)));
    const ruleNodeCount = new Set(nodes.map(n => n.id)).size || 1;

    for (let i = 0; i < count; i++) {
      const seq = i + 1;
      const traceId = `${p.pathHash}-${seq.toString().padStart(4, '0')}`;
      const startTs = TO_TS - Math.round((i / count) * window);

      let status: TraceStatus = 'success';
      if (i % 17 === 5) {
        status = 'timeout';
      } else if ((i % 100) / 100 < failRatio) {
        status = 'failed';
      }

      const durationMs = status === 'timeout'
        ? p.metrics.maxTraceDurationMs + 500
        : status === 'failed'
          ? Math.max(5, Math.round(base * 0.6) + ((i * 7) % 40))
          : Math.round(base + ((i * 13) % spread));

      const inQueueTimeMs = Math.round(durationMs * 0.2);
      const totalSpanTimeMs = durationMs - inQueueTimeMs;

      const item: TraceListItem = {
        traceId,
        startTs,
        endTs: startTs + durationMs,
        durationMs,
        inQueueTimeMs,
        totalSpanTimeMs,
        status,
        withTimeout: status === 'timeout',
        withErrors: status === 'failed',
        queueId: p.queue?.id ?? '',
        queueName: p.queue?.name ?? '—',
        messageType: p.messageType,
        ruleChainId: p.ruleChain?.id ?? '',
        ruleChainName: p.ruleChain?.name ?? 'Unknown Rule Chain',
        ruleNodeCount,
        services,
        queues,
        ruleChains,
        ruleNodes,
        pathId: p.pathId,
        pathName: pathLabel(p),
      };
      entries.push({ item, path: p, status });
    }
  }
  entries.sort((a, b) => b.item.startTs - a.item.startTs); // newest first
  return entries;
}

const ENTRIES = buildEntries();
const BY_ID = new Map<string, MockTraceEntry>(ENTRIES.map(e => [e.item.traceId, e]));

export const TRACE_LIST_MOCK: TraceListItem[] = ENTRIES.map(e => e.item);

export interface TracePathSampleSummary {
  count: number;          // number of collected trace samples for the path
  lastObservedTs: number; // latest sampled-trace start time (0 when none)
}

/** Per-execution-path summary of the collected traces (count + most recent sample time), keyed by
 *  pathId. Used by the sampling-safe Execution Paths table so its Traces/Last Observed values match
 *  the global Traces list exactly. */
export function tracePathSummaries(traces: TraceListItem[] = TRACE_LIST_MOCK): Map<string, TracePathSampleSummary> {
  const map = new Map<string, TracePathSampleSummary>();
  for (const t of traces) {
    const cur = map.get(t.pathId) ?? { count: 0, lastObservedTs: 0 };
    cur.count++;
    cur.lastObservedTs = Math.max(cur.lastObservedTs, t.startTs);
    map.set(t.pathId, cur);
  }
  return map;
}

/** Reconstructs the span waterfall for a trace from its execution path's graph. Successful traces show
 *  the full graph; failed traces stop short (first two levels) with the failing span marked. */
export function buildTraceDetail(traceId: string): TraceDetail | null {
  const entry = BY_ID.get(traceId);
  if (!entry) { return null; }
  const full = buildGraphTree(entry.path.pathGraph);
  let spans: TraceSpan[];
  if (entry.status === 'failed') {
    spans = pruneTree(full, 2);
    assignTiming(spans);
    markLastError(spans);
  } else {
    assignTiming(full);
    if (entry.status === 'timeout') {
      markLastError(full);
    }
    spans = full;
  }
  return { ...entry.item, spans };
}
