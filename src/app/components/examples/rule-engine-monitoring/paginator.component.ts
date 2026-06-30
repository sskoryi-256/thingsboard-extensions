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

import { Component, EventEmitter, Input, Output } from '@angular/core';

export const PAGE_SIZE_OPTIONS = [50, 100, 500, 1000];

/** Compact pagination control: rows-per-page selector, "start–end of total", and first/prev/next/last
 *  navigation. Stateless — the parent owns page/pageSize and re-renders the requested page. */
@Component({
  selector: 'tb-rem-paginator',
  templateUrl: './paginator.component.html',
  styleUrls: ['./paginator.component.scss'],
  standalone: false,
})
export class PaginatorComponent {

  @Input() total = 0;
  @Input() page = 0;                 // 0-based
  @Input() pageSize = PAGE_SIZE_OPTIONS[0];
  @Input() pageSizeOptions = PAGE_SIZE_OPTIONS;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get rangeStart(): number {
    return this.total === 0 ? 0 : this.page * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.total, (this.page + 1) * this.pageSize);
  }

  first(): void { if (this.page > 0) { this.pageChange.emit(0); } }
  prev(): void { if (this.page > 0) { this.pageChange.emit(this.page - 1); } }
  next(): void { if (this.page < this.totalPages - 1) { this.pageChange.emit(this.page + 1); } }
  last(): void { if (this.page < this.totalPages - 1) { this.pageChange.emit(this.totalPages - 1); } }

  onSize(size: number): void {
    this.pageSizeChange.emit(size);
  }
}
