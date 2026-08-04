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

import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { SqlQueryStatus, SqlViewDefinition } from '../sql-schema.model';
import { buildResultColumns, formatCellValue, suggestViewFromError } from '../sql-console.utils';

/** Cap the number of DOM rows so a large result set cannot freeze the UI. */
export const MAX_RENDERED_ROWS = 1000;

@Component({
  selector: 'tb-sql-query-result',
  templateUrl: './sql-query-result.component.html',
  styleUrls: ['./sql-query-result.component.scss'],
  standalone: false
})
export class SqlQueryResultComponent implements OnChanges {

  @Input() rows: Record<string, unknown>[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() status: SqlQueryStatus = 'idle';
  @Input() executionTimeMs: number | null = null;
  @Input() views: SqlViewDefinition[] = [];

  /** Emitted when the user accepts a "did you mean" correction. */
  @Output() fixRelation = new EventEmitter<{ bad: string; full: string }>();

  columns: string[] = [];
  displayRows: Record<string, unknown>[] = [];
  truncated = false;
  copyState: 'idle' | 'copied' = 'idle';
  copyErrorState: 'idle' | 'copied' = 'idle';
  suggestion: { bad: string; full: string } | null = null;

  readonly maxRows = MAX_RENDERED_ROWS;

  ngOnChanges(): void {
    const rows = this.rows ?? [];
    this.columns = buildResultColumns(rows);
    this.truncated = rows.length > MAX_RENDERED_ROWS;
    this.displayRows = this.truncated ? rows.slice(0, MAX_RENDERED_ROWS) : rows;
    this.suggestion = suggestViewFromError(this.error, this.views);
    this.copyState = 'idle';
    this.copyErrorState = 'idle';
  }

  get rowCount(): number {
    return this.rows?.length ?? 0;
  }

  get statusLabel(): string {
    switch (this.status) {
      case 'running': return 'Running';
      case 'success': return 'Success';
      case 'failed': return 'Failed';
      default: return 'Ready';
    }
  }

  cell(row: Record<string, unknown>, column: string): string {
    return formatCellValue(row[column]);
  }

  isNull(row: Record<string, unknown>, column: string): boolean {
    const value = row[column];
    return value === null || value === undefined;
  }

  applySuggestion(): void {
    if (this.suggestion) {
      this.fixRelation.emit(this.suggestion);
    }
  }

  copyAsJson(): void {
    this.copyToClipboard(JSON.stringify(this.rows ?? [], null, 2), 'result');
  }

  copyError(): void {
    this.copyToClipboard(this.error ?? '', 'error');
  }

  private copyToClipboard(text: string, target: 'result' | 'error'): void {
    const done = () => this.flagCopied(target);
    const clipboard = navigator?.clipboard;
    if (clipboard?.writeText) {
      clipboard.writeText(text).then(done, () => this.fallbackCopy(text, done));
    } else {
      this.fallbackCopy(text, done);
    }
  }

  private fallbackCopy(text: string, done: () => void): void {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      done();
    } finally {
      document.body.removeChild(area);
    }
  }

  private flagCopied(target: 'result' | 'error'): void {
    if (target === 'result') {
      this.copyState = 'copied';
      setTimeout(() => (this.copyState = 'idle'), 1500);
    } else {
      this.copyErrorState = 'copied';
      setTimeout(() => (this.copyErrorState = 'idle'), 1500);
    }
  }
}
