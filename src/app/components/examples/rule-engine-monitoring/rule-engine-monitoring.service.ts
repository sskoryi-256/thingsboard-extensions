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

import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injector } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';
import { ApiSpanTreeNode, ApiTraceCoverageSetting, ApiTraceDTO, ApiTraceSummary, FilterOptions, FilterState, MergedStatsDelta, MergedStatsTableRow, NodeTsEntry, PageData, PathListItem, PathListQuery, QueueLagTsEntry, QueueTsEntry, TraceDetail, TraceFilters, TraceListFilters, TracePathDetails, TracePathFilters, TraceSettings, TraceSortField, TraceSortOrder, TraceStatsResponse } from './rule-engine-monitoring.models';
import { buildGroupByParam, buildTraceDetailFromApi } from './rule-engine-monitoring.utils';
import { TRACE_STATS_MOCK } from './execution-paths.mock';

export interface RuleEngineHttpError {
  status: number;
}

export class RuleEngineMonitoringWidgetService {

  private http: HttpClient;

  constructor(injector: Injector) {
    this.http = injector.get(HttpClient);
  }

  private authHeader(): { headers: { Authorization: string } } {
    const token = localStorage.getItem('jwt_token') ?? '';
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  getFilters(): Observable<FilterOptions> {
    return this.http.get<FilterOptions>('/api/ruleEngineMonitoring/filters', this.authHeader()).pipe(
      catchError(this.rethrow)
    );
  }

  getStatsTable(filter: FilterState, groupBy?: string[]): Observable<MergedStatsTableRow[]> {
    const params = this.buildFilterParams(filter, groupBy);
    return this.http.get<MergedStatsTableRow[]>('/api/ruleEngineMonitoring/stats/table', {
      params,
      ...this.authHeader()
    }).pipe(catchError(this.rethrow));
  }

  getStatsTableCompare(filter: FilterState, compareFilter: FilterState, groupBy?: string[]): Observable<MergedStatsDelta[]> {
    const params = this.buildFilterParams(filter, groupBy)
      .set('compareStartTs', compareFilter.startTs.toString())
      .set('compareEndTs', compareFilter.endTs.toString());
    return this.http.get<MergedStatsDelta[]>('/api/ruleEngineMonitoring/stats/table/compare', {
      params,
      ...this.authHeader()
    }).pipe(catchError(this.rethrow));
  }

  // Trace path statistics — one entry per distinct execution path.
  // TEMPORARY: served from the openspec/api.json mock (see execution-paths.mock.ts) instead of the
  // real /api/ruleEngineMonitoring/traceStats endpoint, which is not wired up yet. The `delay`
  // simulates network latency so the loading state is exercised. Swap `of(...)` for the HTTP call
  // below once the backend is available.
  getTraceStats(_filter: FilterState): Observable<TraceStatsResponse> {
    return of(TRACE_STATS_MOCK).pipe(delay(300));
    // const params = this.buildFilterParams(_filter);
    // return this.http.get<TraceStatsResponse>('/api/ruleEngineMonitoring/traceStats', {
    //   params,
    //   ...this.authHeader()
    // }).pipe(catchError(this.rethrow));
  }

  // ── Execution paths (trace_group-backed; see openspec/Architecture/path-api.md) ──────────────

  // Filter dropdown options for the Execution Paths view (single consolidated call).
  getPathFilters(filter: FilterState): Observable<TracePathFilters> {
    const params = new HttpParams()
      .set('startTime', filter.startTs.toString())
      .set('endTime', filter.endTs.toString());
    return this.http.get<TracePathFilters>('/api/traces/paths/filters', {
      params,
      ...this.authHeader()
    }).pipe(catchError(this.rethrow));
  }

  // Paginated, server-sorted, server-filtered list of execution paths.
  getPaths(filter: FilterState, query: PathListQuery): Observable<PageData<PathListItem>> {
    let params = new HttpParams()
      .set('startTime', filter.startTs.toString())
      .set('endTime', filter.endTs.toString())
      .set('page', query.page.toString())
      .set('pageSize', query.pageSize.toString())
      .set('sortBy', query.sortBy)
      .set('sortOrder', query.sortOrder);
    if (query.rootQueueId) { params = params.set('rootQueueId', query.rootQueueId); }
    if (query.rootMessageType) { params = params.set('rootMessageType', query.rootMessageType); }
    if (query.rootRuleChainId) { params = params.set('rootRuleChainId', query.rootRuleChainId); }
    return this.http.get<PageData<PathListItem>>('/api/traces/paths', {
      params,
      ...this.authHeader()
    }).pipe(catchError(this.rethrow));
  }

  // Path details: summary + logical rule node tree with per-node metrics.
  getPathDetails(pathId: string, filter: FilterState): Observable<TracePathDetails> {
    const params = new HttpParams()
      .set('startTime', filter.startTs.toString())
      .set('endTime', filter.endTs.toString());
    return this.http.get<TracePathDetails>(`/api/traces/paths/${encodeURIComponent(pathId)}`, {
      params,
      ...this.authHeader()
    }).pipe(catchError(this.rethrow));
  }

  // Filter dropdown options for the Traces list view (rule engines, queues, rule chains, rule nodes, message types).
  getTraceFilters(): Observable<TraceListFilters> {
    return this.http.get<TraceListFilters>('/api/traces/filters', this.authHeader()).pipe(
      catchError(this.rethrow)
    );
  }

  // Individual traces for the global Traces list.
  getTraces(filter: FilterState, traceFilters: TraceFilters, page: number, pageSize: number,
            ruleChainNameToId: Map<string, string>, ruleNodeNameToId: Map<string, string>,
            sortBy: TraceSortField = 'START_TIME', sortOrder: TraceSortOrder = 'DESC'):
    Observable<PageData<ApiTraceDTO>> {
    let params = new HttpParams()
      .set('startTime', filter.startTs.toString())
      .set('endTime', filter.endTs.toString())
      .set('page', Math.max(page, 0).toString())
      .set('pageSize', Math.max(pageSize, 1).toString())
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);

    const traceId = traceFilters.traceId?.trim();
    if (traceId) {
      params = params.set('traceId', traceId);
      return this.http.get<PageData<ApiTraceDTO>>('/api/traces', {
        params,
        ...this.authHeader()
      }).pipe(catchError(this.rethrow));
    }

    if (traceFilters.ruleEngine) { params = params.set('serviceName', traceFilters.ruleEngine); }
    if (traceFilters.queue) { params = params.set('queueName', traceFilters.queue); }
    if (traceFilters.ruleChain) {
      const ruleChainId = ruleChainNameToId.get(traceFilters.ruleChain) ?? traceFilters.ruleChain;
      params = params.set('ruleChainId', ruleChainId);
    }
    if (traceFilters.ruleNode) {
      const ruleNodeId = ruleNodeNameToId.get(traceFilters.ruleNode) ?? traceFilters.ruleNode;
      params = params.set('ruleNodeId', ruleNodeId);
    }
    if (traceFilters.messageType) { params = params.set('messageType', traceFilters.messageType); }
    if (traceFilters.messageId?.trim()) { params = params.set('messageId', traceFilters.messageId.trim()); }
    if (traceFilters.originator?.trim()) { params = params.set('originatorId', traceFilters.originator.trim()); }
    if (traceFilters.messageData?.trim()) { params = params.set('messageData', traceFilters.messageData.trim()); }
    if (traceFilters.messageMetadata?.trim()) { params = params.set('messageMetadata', traceFilters.messageMetadata.trim()); }
    if (traceFilters.withError) { params = params.set('errorsOnly', 'true'); }
    if (traceFilters.withTimeout) { params = params.set('hasTimeOutsByQueue', 'true'); }
    // execution-path drill-down: restrict to the path's saved (related) traces
    if (traceFilters.pathId) { params = params.set('pathId', traceFilters.pathId); }

    return this.http.get<PageData<ApiTraceDTO>>('/api/traces', {
      params,
      ...this.authHeader()
    }).pipe(catchError(this.rethrow));
  }

  // Full trace detail (span waterfall) for the shared Trace Details view. Combines the trace summary
  // (GET /api/traces/{id}) with the span tree (GET /api/traces/{id}/spans/tree) and maps them to TraceDetail.
  getTrace(traceId: string): Observable<TraceDetail | null> {
    const id = encodeURIComponent(traceId);
    return forkJoin({
      summary: this.http.get<ApiTraceSummary>(`/api/traces/${id}`, this.authHeader()),
      tree: this.http.get<ApiSpanTreeNode[]>(`/api/traces/${id}/spans/tree`, this.authHeader()),
    }).pipe(
      map(({ summary, tree }) => buildTraceDetailFromApi(traceId, summary, tree ?? [])),
      catchError(this.rethrow)
    );
  }

  // Trace coverage setting — persisted per tenant via GET/POST /api/traces/coverage.
  getTraceSettings(): Observable<TraceSettings> {
    return this.http.get<ApiTraceCoverageSetting>('/api/traces/coverage', this.authHeader()).pipe(
      map(s => this.fromApiTraceSetting(s)),
      catchError(this.rethrow)
    );
  }

  saveTraceSettings(settings: TraceSettings): Observable<TraceSettings> {
    return this.http.post<ApiTraceCoverageSetting>('/api/traces/coverage', this.toApiTraceSetting(settings), this.authHeader()).pipe(
      map(s => this.fromApiTraceSetting(s)),
      catchError(this.rethrow)
    );
  }

  private fromApiTraceSetting(s: ApiTraceCoverageSetting): TraceSettings {
    return {
      enabled: s.enabled,
      tracesPerInterval: s.tracesPerInterval,
      tracesPerPack: s.tracesPerPack,
      interval: s.intervalUnit === 'MINUTE' ? 60 : 1,
      ruleEngineRotation: s.ruleEngineRotation,
      ruleEngineSwitchInterval: s.switchPeriodSeconds,
      relatedTraceSampleInterval: s.relatedTraceSampleIntervalSeconds,
      messagePayloadRecording: this.fromApiMessagePayloadRecording(s.messagePayloadRecording),
      maxTraceGroupsPerDay: s.maxTraceGroupsPerDay ?? 0,
    };
  }

  private toApiTraceSetting(s: TraceSettings): ApiTraceCoverageSetting {
    return {
      enabled: s.enabled,
      tracesPerInterval: s.tracesPerInterval,
      tracesPerPack: s.tracesPerPack,
      intervalUnit: (s.interval % 60 === 0 && s.interval >= 60) ? 'MINUTE' : 'SECOND',
      ruleEngineRotation: s.ruleEngineRotation,
      switchPeriodSeconds: s.ruleEngineSwitchInterval,
      relatedTraceSampleIntervalSeconds: s.relatedTraceSampleInterval,
      messagePayloadRecording: this.toApiMessagePayloadRecording(s.messagePayloadRecording),
      maxTraceGroupsPerDay: s.maxTraceGroupsPerDay,
    };
  }

  private fromApiMessagePayloadRecording(value: ApiTraceCoverageSetting['messagePayloadRecording']): TraceSettings['messagePayloadRecording'] {
    if (value === 'FIRST_SPAN' || value === 'ALL_SPANS') {
      return value;
    }
    return 'NONE';
  }

  private toApiMessagePayloadRecording(value: TraceSettings['messagePayloadRecording']): ApiTraceCoverageSetting['messagePayloadRecording'] {
    return value;
  }

  getNodeStatsTimeseries(filter: FilterState, intervalMs: number): Observable<NodeTsEntry[]> {
    const params = this.buildFilterParams(filter).set('intervalMs', intervalMs.toString());
    return this.http.get<NodeTsEntry[]>('/api/ruleEngineMonitoring/nodeStats/timeseries', {
      params,
      ...this.authHeader()
    }).pipe(catchError(this.rethrow));
  }

  getQueueStatsTimeseries(filter: FilterState, intervalMs: number): Observable<QueueTsEntry[]> {
    const params = this.buildFilterParams(filter).set('intervalMs', intervalMs.toString());
    return this.http.get<QueueTsEntry[]>('/api/ruleEngineMonitoring/queueStats/timeseries', {
      params,
      ...this.authHeader()
    }).pipe(catchError(this.rethrow));
  }

  getQueueLagStatsTimeseries(filter: FilterState, intervalMs: number): Observable<QueueLagTsEntry[]> {
    const params = this.buildFilterParams(filter).set('intervalMs', intervalMs.toString());
    return this.http.get<QueueLagTsEntry[]>('/api/ruleEngineMonitoring/queueLagStats/timeseries', {
      params,
      ...this.authHeader()
    }).pipe(catchError(this.rethrow));
  }

  // Last-known total queue lag. Backend returns a single number (the "all queues" aggregate when queueIds is empty).
  getCurrentQueueLag(queueIds?: string[]): Observable<number> {
    let params = new HttpParams();
    for (const id of queueIds ?? []) {
      params = params.append('queueIds', id);
    }
    return this.http.get<number>('/api/ruleEngineMonitoring/queueLagStats/last', {
      params,
      ...this.authHeader()
    }).pipe(catchError(this.rethrow));
  }

  private buildFilterParams(filter: FilterState, groupBy?: string[]): HttpParams {
    let params = new HttpParams()
      .set('startTs', filter.startTs.toString())
      .set('endTs', filter.endTs.toString());

    for (const id of filter.queueIds ?? []) {
      params = params.append('queueIds', id);
    }
    for (const id of filter.ruleChainIds ?? []) {
      params = params.append('ruleChainIds', id);
    }
    for (const id of filter.ruleNodeIds ?? []) {
      params = params.append('ruleNodeIds', id);
    }
    for (const id of filter.serviceIds ?? []) {
      params = params.append('serviceIds', id);
    }
    if (groupBy?.length) {
      params = params.set('groupBy', buildGroupByParam(groupBy));
    }
    return params;
  }

  private rethrow(err: HttpErrorResponse): never {
    throw { status: err.status } as RuleEngineHttpError;
  }
}
