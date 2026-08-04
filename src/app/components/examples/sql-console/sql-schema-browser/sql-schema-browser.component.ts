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
import { SqlFieldDefinition, SqlViewDefinition } from '../sql-schema.model';
import { fullViewName } from '../sql-console.utils';

interface FilteredView {
  view: SqlViewDefinition;
  fields: SqlFieldDefinition[];
}

@Component({
  selector: 'tb-sql-schema-browser',
  templateUrl: './sql-schema-browser.component.html',
  styleUrls: ['./sql-schema-browser.component.scss'],
  standalone: false
})
export class SqlSchemaBrowserComponent implements OnChanges {

  @Input() views: SqlViewDefinition[] = [];

  /** Emits the text to insert into the editor (a full view name or a field name). */
  @Output() insert = new EventEmitter<string>();

  /** Emits an example query to load into the editor (replacing its content). */
  @Output() useExample = new EventEmitter<string>();

  filter = '';

  private readonly expanded = new Set<string>();
  private initialized = false;

  ngOnChanges(): void {
    if (!this.initialized && this.views.length) {
      this.expanded.add(this.viewName(this.views[0]));
      this.initialized = true;
    }
  }

  get datasetGroup(): FilteredView[] {
    return this.filtered();
  }

  get hasDatasets(): boolean {
    return this.views.length > 0;
  }

  private filtered(): FilteredView[] {
    const term = this.filter.trim().toLowerCase();
    if (!term) {
      return this.views.map(view => ({ view, fields: view.fields }));
    }
    const result: FilteredView[] = [];
    for (const view of this.views) {
      const viewMatches = this.viewName(view).toLowerCase().includes(term);
      const fields = view.fields.filter(f => f.name.toLowerCase().includes(term));
      if (viewMatches || fields.length) {
        result.push({ view, fields: viewMatches ? view.fields : fields });
      }
    }
    return result;
  }

  /** Expands (and thereby reveals) a view by full name — used after creating one. */
  expandView(fullName: string): void {
    this.expanded.add(fullName);
  }

  viewName(view: SqlViewDefinition): string {
    return fullViewName(view);
  }

  /** Views auto-expand while filtering so matches are visible. */
  isExpanded(view: SqlViewDefinition): boolean {
    return !!this.filter.trim() || this.expanded.has(this.viewName(view));
  }

  toggle(view: SqlViewDefinition): void {
    const name = this.viewName(view);
    if (this.expanded.has(name)) {
      this.expanded.delete(name);
    } else {
      this.expanded.add(name);
    }
  }

  insertView(view: SqlViewDefinition): void {
    this.insert.emit(this.viewName(view));
  }

  insertField(field: SqlFieldDefinition): void {
    this.insert.emit(field.name);
  }

  useExampleQuery(view: SqlViewDefinition): void {
    this.useExample.emit(view.example);
  }

  clearFilter(): void {
    this.filter = '';
  }
}
