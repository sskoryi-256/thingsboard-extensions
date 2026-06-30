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

import { TracePathGraph, TraceSpan } from './rule-engine-monitoring.models';
import { shortNodeType } from './rule-engine-monitoring.utils';

// Shared rule-node graph / waterfall helpers used by the execution-paths timeline, the global
// traces mock, and the Trace Details view. Pure functions over TraceSpan trees (no Angular deps).

/** Deterministic mock rule-engine index (0..2) for a node id, e.g. "rule-engine-1". */
export function serviceIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) { h = (h * 31 + id.charCodeAt(i)) | 0; }
  return Math.abs(h) % 3;
}

/** Builds a span tree from the path graph starting at rootNodeId, following every outgoing edge so
 *  branches (a node connected to multiple rule nodes) are preserved. Each span carries the relation of
 *  the edge that led into it. A node reached again on the same branch is rendered as a leaf to break
 *  cycles. Any nodes unreachable from the root are returned as additional roots so nothing is dropped. */
export function buildGraphTree(graph: TracePathGraph | null | undefined): TraceSpan[] {
  if (!graph) { return []; }
  const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
  const outEdges = new Map<string, { to: string; relation: string }[]>();
  for (const e of graph.edges ?? []) {
    const list = outEdges.get(e.from) ?? [];
    list.push({ to: e.to, relation: e.relation });
    outEdges.set(e.from, list);
  }

  const globalSeen = new Set<string>();

  const build = (id: string, relation: string | null, ancestors: Set<string>): TraceSpan | null => {
    const n = nodeMap.get(id);
    if (!n) { return null; }
    globalSeen.add(id);
    const node: TraceSpan = {
      spanId: id,
      name: n.name,
      type: shortNodeType(n.type),
      ruleChain: n.ruleChainName ?? 'Unknown Rule Chain',
      queueName: n.queueName ?? null,
      serviceId: `rule-engine-${serviceIndex(id)}`,
      relation,
      children: [],
      startMs: 0,
      durationMs: 0,
      error: false,
    };
    // stop descending on a cycle (id already on the current branch)
    if (ancestors.has(id)) { return node; }
    const nextAncestors = new Set(ancestors).add(id);
    for (const e of outEdges.get(id) ?? []) {
      const child = build(e.to, e.relation, nextAncestors);
      if (child) { node.children.push(child); }
    }
    return node;
  };

  const roots: TraceSpan[] = [];
  const root = graph.rootNodeId && nodeMap.has(graph.rootNodeId)
    ? build(graph.rootNodeId, null, new Set())
    : null;
  if (root) { roots.push(root); }
  // include any nodes not reachable from the root as standalone roots
  for (const n of graph.nodes) {
    if (!globalSeen.has(n.id)) {
      const orphan = build(n.id, null, new Set());
      if (orphan) { roots.push(orphan); }
    }
  }
  return roots;
}

/** Deep-clones a span tree, keeping at most `maxDepth` levels of nodes. */
export function pruneTree(nodes: TraceSpan[], maxDepth: number, depth = 1): TraceSpan[] {
  if (maxDepth < 1) { return []; }
  return nodes.map(n => ({
    ...n,
    children: depth >= maxDepth ? [] : pruneTree(n.children, maxDepth, depth + 1),
  }));
}

/** Assigns a deterministic mock waterfall to a span tree: each parent span encloses its children
 *  (sequential), each leaf gets a mock duration. Returns the total trace duration (ms). */
export function assignTiming(roots: TraceSpan[]): number {
  let seq = 0;
  const nextDur = () => 8 + ((seq++ * 37) % 110);  // deterministic 8..117 ms
  const walk = (node: TraceSpan, start: number): number => {
    node.startMs = start;
    node.error = false;
    if (!node.children.length) {
      node.durationMs = nextDur();
      return start + node.durationMs;
    }
    let cursor = start + 2;  // small self overhead before children
    for (const c of node.children) {
      cursor = walk(c, cursor);
    }
    node.durationMs = (cursor - start) + 2;  // enclose children + tail
    return start + node.durationMs;
  };
  let total = 0;
  for (const r of roots) {
    total = Math.max(total, walk(r, 0));
  }
  return total;
}

/** Marks the latest-ending span as errored (used to colour the failing span in failed traces). */
export function markLastError(roots: TraceSpan[]): void {
  let last: TraceSpan | null = null;
  const walk = (n: TraceSpan) => {
    if (!last || (n.startMs + n.durationMs) > (last.startMs + last.durationMs)) { last = n; }
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  if (last) { (last as TraceSpan).error = true; }
}
