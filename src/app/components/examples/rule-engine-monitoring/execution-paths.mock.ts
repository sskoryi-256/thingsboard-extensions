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

import {
  TracePath, TracePathGraphEdge, TracePathGraphNode, TraceRuleNodeMetric, TraceStatsResponse
} from './rule-engine-monitoring.models';

// Large generated mock trace stats payload — served to the Execution Paths dashboard until the
// real /api/ruleEngineMonitoring/traceStats endpoint is wired up (see rule-engine-monitoring.service.ts).
// Deterministic (seeded) so the dataset is stable across reloads. Shape matches openspec/api.json,
// just much larger: many paths, each with a deep/branching rule-node graph and per-node metrics.

const FROM_TS = 1781618400000;
const TO_TS = 1781704800000;
const PATH_COUNT = 140;

// Deterministic PRNG (mulberry32) so the mock is identical on every load.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

const QUEUES = [
  { id: '6a0c1510-d1c3-11f0-a77a-290cfb12f001', name: 'Main' },
  { id: '993c1510-d1c3-11f0-a77a-290cfb12f002', name: 'HighPriority' },
  { id: 'b21c1510-d1c3-11f0-a77a-290cfb12f003', name: 'SequentialByOriginator' },
  { id: 'c84c1510-d1c3-11f0-a77a-290cfb12f004', name: 'BulkProcessing' },
];

const RULE_CHAINS = [
  { id: 'rc_root', name: 'Root Rule Chain' },
  { id: 'rc_device_profile', name: 'Device Profile Rule Chain' },
  { id: 'rc_alarms', name: 'Alarm Processing Chain' },
  { id: 'rc_telemetry', name: 'Telemetry Pipeline' },
  { id: 'rc_integration', name: 'Cloud Integration Chain' },
  { id: 'rc_notifications', name: 'Notification Chain' },
];

const MESSAGE_TYPES = [
  'POST_TELEMETRY', 'POST_ATTRIBUTES', 'ATTRIBUTES_UPDATED', 'RPC_CALL_FROM_DEVICE',
  'ACTIVITY_EVENT', 'INACTIVITY_EVENT', 'CONNECT_EVENT', 'ENTITY_CREATED',
  'ALARM', 'TO_SERVER_RPC_REQUEST', 'ENTITY_UPDATED', 'ENTITY_DELETED',
];

interface NodeKind { type: string; short: string; name: string; }

const NODE_KINDS: NodeKind[] = [
  { type: 'org.thingsboard.rule.engine.filter.TbJsFilterNode',          short: 'TbJsFilterNode',          name: 'Script Filter' },
  { type: 'org.thingsboard.rule.engine.filter.TbCheckRelationNode',     short: 'TbCheckRelationNode',     name: 'Check Relation' },
  { type: 'org.thingsboard.rule.engine.transform.TbTransformMsgNode',   short: 'TbTransformMsgNode',      name: 'Transform Script' },
  { type: 'org.thingsboard.rule.engine.telemetry.TbMsgTimeseriesNode',  short: 'TbMsgTimeseriesNode',     name: 'Save Timeseries' },
  { type: 'org.thingsboard.rule.engine.telemetry.TbMsgAttributesNode',  short: 'TbMsgAttributesNode',     name: 'Save Attributes' },
  { type: 'org.thingsboard.rule.engine.action.TbCreateAlarmNode',       short: 'TbCreateAlarmNode',       name: 'Create Alarm' },
  { type: 'org.thingsboard.rule.engine.action.TbClearAlarmNode',        short: 'TbClearAlarmNode',        name: 'Clear Alarm' },
  { type: 'org.thingsboard.rule.engine.rpc.TbSendRpcRequestNode',       short: 'TbSendRpcRequestNode',    name: 'RPC Request' },
  { type: 'org.thingsboard.rule.engine.rabbitmq.TbRabbitMqNode',        short: 'TbRabbitMqNode',          name: 'Push to RabbitMQ' },
  { type: 'org.thingsboard.rule.engine.kafka.TbKafkaNode',              short: 'TbKafkaNode',             name: 'Push to Kafka' },
  { type: 'org.thingsboard.rule.engine.rest.TbRestApiCallNode',         short: 'TbRestApiCallNode',       name: 'REST API Call' },
  { type: 'org.thingsboard.rule.engine.mail.TbMsgToEmailNode',          short: 'TbMsgToEmailNode',        name: 'To Email' },
  { type: 'org.thingsboard.rule.engine.delay.TbMsgDelayNode',           short: 'TbMsgDelayNode',          name: 'Delay' },
  { type: 'org.thingsboard.rule.engine.metadata.TbGetAttributesNode',   short: 'TbGetAttributesNode',     name: 'Enrich Attributes' },
  { type: 'org.thingsboard.rule.engine.geo.TbGpsGeofencingActionNode',  short: 'TbGpsGeofencingActionNode', name: 'Geofencing' },
  { type: 'org.thingsboard.rule.engine.aws.sqs.TbSqsNode',              short: 'TbSqsNode',               name: 'Push to SQS' },
];

const ROOT_KIND: NodeKind = {
  type: 'org.thingsboard.rule.engine.filter.TbMsgTypeSwitchNode',
  short: 'TbMsgTypeSwitchNode',
  name: 'Message Type Switch',
};

const RELATIONS = ['Success', 'True', 'False', 'Post telemetry', 'Post attributes', 'Created', 'Cleared', 'Failure', 'Other'];

function hex8(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}

function buildPath(index: number): TracePath {
  const rng = makeRng(0x9e3779b9 ^ (index * 2654435761));
  const queue = pick(QUEUES, rng);
  const ruleChain = pick(RULE_CHAINS, rng);
  const messageType = pick(MESSAGE_TYPES, rng);

  const nodeCount = 7 + Math.floor(rng() * 14); // 7..20 rule nodes
  const kinds: NodeKind[] = [];
  const nodes: TracePathGraphNode[] = [];
  const edges: TracePathGraphEdge[] = [];

  // ~45% of paths forward to a second rule chain + queue partway through the flow (cross-chain /
  // cross-queue processing), so the distinct Rule Chains / Queues counts can exceed one.
  const forks = rng() < 0.45 && nodeCount > 4;
  const forkAt = forks ? 2 + Math.floor(rng() * (nodeCount - 3)) : nodeCount;
  const secondaryChain = forks ? pick(RULE_CHAINS.filter(c => c.id !== ruleChain.id), rng) : ruleChain;
  const secondaryQueue = forks ? pick(QUEUES.filter(q => q.id !== queue.id), rng) : queue;

  for (let n = 0; n < nodeCount; n++) {
    const kind = n === 0 ? ROOT_KIND : pick(NODE_KINDS, rng);
    kinds.push(kind);
    const inFork = n >= forkAt;
    const nodeChain = inFork ? secondaryChain : ruleChain;
    const nodeQueue = inFork ? secondaryQueue : queue;
    nodes.push({
      id: `p${index}_n${n}`,
      name: n === 0 ? kind.name : `${kind.name} ${n}`,
      type: kind.type,
      ruleChainId: nodeChain.id,
      ruleChainName: nodeChain.name,
      queueId: nodeQueue.id,
      queueName: nodeQueue.name,
    });
  }

  // Edges: mostly a chain from the previous node, but ~30% attach to an earlier node — which
  // creates branches (a node fanning out to several rule nodes).
  for (let n = 1; n < nodeCount; n++) {
    const parent = rng() < 0.7 ? n - 1 : Math.floor(rng() * n);
    edges.push({ from: `p${index}_n${parent}`, to: `p${index}_n${n}`, relation: pick(RELATIONS, rng) });
  }

  const traceCount = 300 + Math.floor(rng() * 5200);
  const failedTraceCount = Math.floor(traceCount * (0.02 + rng() * 0.32));
  const timeoutTraceCount = Math.floor(rng() * 18);
  const successTraceCount = traceCount - failedTraceCount;
  const avgTraceDurationMs = 18 + Math.floor(rng() * 130);
  const p95TraceDurationMs = avgTraceDurationMs + Math.floor(rng() * 380);
  const maxTraceDurationMs = p95TraceDurationMs + Math.floor(rng() * 900);

  const ruleNodeMetrics: TraceRuleNodeMetric[] = nodes.map((node, n) => {
    const executionCount = Math.floor(traceCount * (0.55 + rng() * 0.45));
    const failedExecutionCount = Math.floor(executionCount * rng() * 0.09);
    const avgDurationMs = 1 + Math.floor(rng() * 45);
    const p95DurationMs = avgDurationMs + Math.floor(rng() * 130);
    const maxDurationMs = p95DurationMs + Math.floor(rng() * 420);
    return {
      ruleNodeId: node.id,
      ruleNodeName: node.name,
      ruleNodeType: kinds[n].short,
      executionCount,
      failedExecutionCount,
      timeoutCount: Math.floor(rng() * 6),
      avgDurationMs,
      maxDurationMs,
      p95DurationMs,
      totalDurationMs: executionCount * avgDurationMs,
      ruleChainId: node.ruleChainId,
      ruleChainName: node.ruleChainName,
    };
  });

  const lastAction = nodes[nodeCount - 1].name.replace(/\s+\d+$/, '');

  return {
    pathId: `path_${index}_${hex8(index * 7919 + 13)}`,
    pathHash: hex8(index * 2246822519 + 374761393),
    name: `${messageType} / ${lastAction}`,
    messageType,
    queue,
    ruleChain,
    metrics: {
      traceCount,
      successTraceCount,
      failedTraceCount,
      timeoutTraceCount,
      successRate: successTraceCount / traceCount,
      avgTraceDurationMs,
      maxTraceDurationMs,
      p95TraceDurationMs,
      totalTraceDurationMs: traceCount * avgTraceDurationMs,
    },
    pathGraph: {
      rootNodeId: `p${index}_n0`,
      nodes,
      edges,
    },
    ruleNodeMetrics,
  };
}

function generateMock(): TraceStatsResponse {
  const paths: TracePath[] = [];
  for (let i = 0; i < PATH_COUNT; i++) {
    paths.push(buildPath(i));
  }

  const totalTraceCount = paths.reduce((s, p) => s + p.metrics.traceCount, 0);
  const totalExecutionCount = paths.reduce(
    (s, p) => s + p.ruleNodeMetrics.reduce((a, m) => a + m.executionCount, 0), 0);
  const errorTraceCount = paths.reduce((s, p) => s + p.metrics.failedTraceCount, 0);
  const timeoutTraceCount = paths.reduce((s, p) => s + p.metrics.timeoutTraceCount, 0);
  const maxTraceDurationMs = paths.reduce((m, p) => Math.max(m, p.metrics.maxTraceDurationMs), 0);
  const weightedAvg = totalTraceCount
    ? Math.round(paths.reduce((s, p) => s + p.metrics.avgTraceDurationMs * p.metrics.traceCount, 0) / totalTraceCount)
    : 0;

  return {
    fromTs: FROM_TS,
    toTs: TO_TS,
    interval: '24h',
    page: { page: 0, pageSize: PATH_COUNT, totalElements: paths.length },
    summary: {
      totalTraceCount,
      totalExecutionCount,
      avgTraceDurationMs: weightedAvg,
      maxTraceDurationMs,
      successRate: totalTraceCount ? (totalTraceCount - errorTraceCount) / totalTraceCount : 0,
      errorTraceCount,
      timeoutTraceCount,
    },
    paths,
  };
}

export const TRACE_STATS_MOCK: TraceStatsResponse = generateMock();
