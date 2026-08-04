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

import { ChangeDetectorRef, Component, Injector, Input, NgZone, OnInit, ViewChild } from '@angular/core';
import { WidgetContext } from '@home/models/widget-component.models';
import { finalize } from 'rxjs/operators';
import { SqlQueryConsoleComponent } from './sql-query-console/sql-query-console.component';
import { SqlQueryService, SQL_QUERY_FALLBACK_ERROR } from './sql-query.service';
import { INITIAL_QUERY, datasetViewDefinition } from './sql-schema.data';
import { SqlQueryStatus, SqlViewDefinition } from './sql-schema.model';

@Component({
  selector: 'tb-sql-console-page',
  templateUrl: './sql-console-page.component.html',
  styleUrls: ['./sql-console-page.component.scss'],
  standalone: false
})
export class SqlConsolePageComponent implements OnInit {

  /** Widget context, when embedded as a ThingsBoard widget. Optional for standalone use. */
  @Input() ctx?: WidgetContext;

  @ViewChild(SqlQueryConsoleComponent) private console?: SqlQueryConsoleComponent;

  /** Analytics datasets — the only queryable relations. */
  datasets: SqlViewDefinition[] = [];

  query = INITIAL_QUERY;
  loading = false;
  status: SqlQueryStatus = 'idle';
  rows: Record<string, unknown>[] = [];
  error: string | null = null;
  executionTimeMs: number | null = null;

  private service!: SqlQueryService;

  constructor(
    private injector: Injector,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  /** The queryable relations offered to the schema browser and the editor autocomplete. */
  get views(): SqlViewDefinition[] {
    return this.datasets;
  }

  ngOnInit(): void {
    this.service = new SqlQueryService(this.ctx?.$injector ?? this.injector);
    this.loadDatasets();
  }

  /** Loads the tenant's analytics datasets — the only queryable relations — for the browser + autocomplete. */
  private loadDatasets(): void {
    this.service.listDatasets().subscribe({
      next: infos => this.zone.run(() => {
        this.datasets = (infos ?? [])
          .filter(d => !!d?.name)
          .map(datasetViewDefinition);
        this.cdr.markForCheck();
      }),
      // Endpoint may be unavailable on older builds — leave the list empty rather than erroring.
      error: () => undefined
    });
  }

  onQueryChange(query: string): void {
    this.query = query;
  }

  onInsert(text: string): void {
    this.console?.insertAtCursor(text);
  }

  onUseExample(sql: string): void {
    this.query = sql;
    this.console?.loadQuery(sql);
    this.cdr.markForCheck();
  }

  onFixRelation(fix: { bad: string; full: string }): void {
    this.console?.fixRelation(fix.bad, fix.full);
  }

  onRun(query: string): void {
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.status = 'running';
    this.error = null;
    this.executionTimeMs = null;
    const start = performance.now();

    this.service.executeQuery(query)
      .pipe(finalize(() => this.zone.run(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })))
      .subscribe({
        // Re-enter Angular's zone: in the widget runtime the HTTP callback may fire
        // outside it, so without this the view only refreshes on the next user event.
        next: rows => this.zone.run(() => {
          this.rows = Array.isArray(rows) ? [...rows] : [];
          this.executionTimeMs = Math.round(performance.now() - start);
          this.status = 'success';
          this.cdr.markForCheck();
        }),
        error: (err: Error) => this.zone.run(() => {
          this.rows = [];
          this.error = err?.message || SQL_QUERY_FALLBACK_ERROR;
          this.executionTimeMs = Math.round(performance.now() - start);
          this.status = 'failed';
          this.cdr.markForCheck();
        })
      });
  }
}
