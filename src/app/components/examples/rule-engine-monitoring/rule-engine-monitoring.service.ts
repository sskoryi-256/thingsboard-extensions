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
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FilterOptions, FilterState, MergedStatsDelta, MergedStatsTableRow, NodeTsEntry, QueueLagTsEntry, QueueTsEntry } from './rule-engine-monitoring.models';
import { buildGroupByParam } from './rule-engine-monitoring.utils';

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
