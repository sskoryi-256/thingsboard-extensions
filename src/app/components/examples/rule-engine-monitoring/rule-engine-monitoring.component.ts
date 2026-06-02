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

import { Component, Injector, Input, OnInit } from '@angular/core';
import { WidgetContext } from '@home/models/widget-component.models';
import { CompareState, FilterOptions, FilterState } from './rule-engine-monitoring.models';
import { RuleEngineMonitoringWidgetService, RuleEngineHttpError } from './rule-engine-monitoring.service';

const SYS_TENANT_ID = '13814000-1dd2-11b2-8080-808080808080';

@Component({
  selector: 'tb-rule-engine-monitoring',
  templateUrl: 'rule-engine-monitoring.component.html',
  styleUrls: ['rule-engine-monitoring.component.scss'],
  standalone: false
})
export class RuleEngineMonitoringComponent implements OnInit {

  @Input() ctx: WidgetContext;

  filterOptions: FilterOptions | null = null;
  filterState: FilterState | null = null;
  compareState: CompareState | null = null;
  compareActive = false;
  rangeSelectActive = false;
  errorMessage: string | null = null;
  injector: Injector | null = null;

  private preCompareFilterState: FilterState | null = null;

  private service: RuleEngineMonitoringWidgetService;

  ngOnInit(): void {
    this.ctx.$scope.ruleEngineMonitoringWidget = this;
    this.injector = this.ctx.$injector;
    this.service = new RuleEngineMonitoringWidgetService(this.ctx.$injector);
    this.loadFilters();
  }

  onDataUpdated(): void {}

  onFilterChange(state: FilterState): void {
    this.filterState = { ...state };
    this.ctx.detectChanges();
  }

  onTableFilterChange(state: FilterState): void {
    this.filterState = { ...state };
    this.ctx.detectChanges();
  }

  onCompareToggle(active: boolean): void {
    this.compareActive = active;
    if (active) {
      this.preCompareFilterState = this.filterState ? { ...this.filterState } : null;
      this.compareState = { baseRange: null, compareRange: null };
      this.rangeSelectActive = true;
    } else {
      // Deactivate: clear compare state, disable brush, restore pre-compare filter
      this.compareState = null;
      this.rangeSelectActive = false;
      if (this.preCompareFilterState) {
        this.filterState = { ...this.preCompareFilterState };
        this.preCompareFilterState = null;
      }
    }
    this.ctx.detectChanges();
  }

  onRefreshClick(): void {
    this.loadFilters();
  }

  onResetClick(): void {
    if (this.compareActive) {
      // In compare mode: clear selected ranges, go back to N/A / No data state, re-enable brush
      this.compareState = { baseRange: null, compareRange: null };
      this.rangeSelectActive = true;
    }
    // Normal mode: filter bar already cleared dimension selections and emitted filterChange
    this.ctx.detectChanges();
  }

  onRangeSelected(range: { start: number; end: number }): void {
    if (!this.compareState) return;

    if (this.compareState.baseRange === null) {
      // First brush — store as base range; KPI cards and table fetch for this range
      this.compareState = { baseRange: { startTs: range.start, endTs: range.end }, compareRange: null };
    } else if (this.compareState.compareRange === null) {
      // Second brush — store as compare range, disable brush, trigger delta display
      this.compareState = { ...this.compareState, compareRange: { startTs: range.start, endTs: range.end } };
      this.rangeSelectActive = false;
    }
    this.ctx.detectChanges();
  }

  private loadFilters(): void {
    this.service.getFilters().subscribe({
      next: opts => {
        opts.queues.sort((a, b) => {
          const aSys = a.tenantId === SYS_TENANT_ID ? 0 : 1;
          const bSys = b.tenantId === SYS_TENANT_ID ? 0 : 1;
          return aSys - bSys || a.name.localeCompare(b.name);
        });
        opts.ruleChains.sort((a, b) => a.name.localeCompare(b.name));
        opts.ruleNodes.sort((a, b) => a.ruleChainName.localeCompare(b.ruleChainName) || a.name.localeCompare(b.name));
        this.filterOptions = opts;
        this.ctx.detectChanges();
      },
      error: (err: RuleEngineHttpError) => {
        this.errorMessage = err?.status === 401 || err?.status === 403
          ? 'Access denied. Please log in with sufficient permissions.'
          : 'Failed to load filter options.';
        this.ctx.detectChanges();
      }
    });
  }
}
