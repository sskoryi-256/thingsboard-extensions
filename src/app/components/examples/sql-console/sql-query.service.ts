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

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SqlDatasetInfo } from './sql-schema.model';

export const SQL_QUERY_FALLBACK_ERROR = 'SQL query execution failed.';

/**
 * Executes read-only SQL through the platform endpoint POST /api/sql/query.
 *
 * Plain class (not @Injectable) constructed with the widget's Injector, matching the
 * convention of the other example widget services in this module. Authentication is
 * taken from the running ThingsBoard session — no credentials are hardcoded.
 */
export class SqlQueryService {

  private readonly http: HttpClient;

  constructor(injector: Injector) {
    this.http = injector.get(HttpClient);
  }

  executeQuery(query: string): Observable<Record<string, unknown>[]> {
    // Access control is per-user entity filtering on the backend — no permission list is sent.
    return this.http.post<Record<string, unknown>[]>('/api/sql/query', { query }, this.authHeader()).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => new Error(this.errorMessage(err))))
    );
  }

  /** Lists the current tenant's analytics datasets (the queryable surface) via GET /api/sql/datasets. */
  listDatasets(): Observable<SqlDatasetInfo[]> {
    return this.http.get<SqlDatasetInfo[]>('/api/sql/datasets', this.authHeader()).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => new Error(this.errorMessage(err))))
    );
  }

  private authHeader(): { headers: { Authorization: string } } {
    const token = localStorage.getItem('jwt_token') ?? '';
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  private errorMessage(err: HttpErrorResponse): string {
    const backend = err?.error;
    if (backend && typeof backend === 'object' && typeof backend.message === 'string' && backend.message.trim()) {
      return backend.message;
    }
    if (typeof backend === 'string' && backend.trim()) {
      return backend;
    }
    if (err?.message) {
      return err.message;
    }
    return SQL_QUERY_FALLBACK_ERROR;
  }
}
