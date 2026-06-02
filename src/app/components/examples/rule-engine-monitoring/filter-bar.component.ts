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

import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FilterOptions, FilterState, QueueOption, RuleChainOption, RuleNodeOption } from './rule-engine-monitoring.models';

interface TimePreset {
  label: string;
  value: string;
  ms: number;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const SYS_TENANT_ID = '13814000-1dd2-11b2-8080-808080808080';

@Component({
  selector: 'tb-rem-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss'],
  standalone: false
})
export class FilterBarComponent implements OnInit, OnChanges {

  @Input() filterOptions: FilterOptions | null = null;
  @Input() locked = false;
  @Input() externalFilterState: FilterState | null = null;

  @Input() refreshing = false;

  @Output() filterChange = new EventEmitter<FilterState>();
  @Output() resetClick = new EventEmitter<void>();
  @Output() compareToggle = new EventEmitter<boolean>();
  @Output() refreshClick = new EventEmitter<void>();

  readonly presets: TimePreset[] = [
    { label: 'Last 1h',  value: '1h',  ms: HOUR_MS },
    { label: 'Last 24h', value: '24h', ms: DAY_MS },
    { label: 'Last 7d',  value: '7d',  ms: 7 * DAY_MS },
    { label: 'Last 30d', value: '30d', ms: 30 * DAY_MS },
    { label: 'Custom',   value: 'custom', ms: 0 },
  ];

  activePreset = '24h';
  customStart = '';
  customEnd = '';

  get showCustomRange(): boolean {
    return this.activePreset === 'custom';
  }

  selectedQueueIds: string[] = [];
  selectedChainIds: string[] = [];
  selectedNodeIds: string[] = [];
  selectedServiceId: string | null = null;

  queueSearch = '';
  chainSearch = '';
  nodeSearch = '';

  compareActive = false;

  queueLabel(q: QueueOption): string {
    return q.tenantId === SYS_TENANT_ID ? `${q.name} [sys]` : q.name;
  }

  get filteredQueues(): QueueOption[] {
    if (!this.filterOptions) { return []; }
    const q = this.queueSearch.toLowerCase();
    return q ? this.filterOptions.queues.filter(o => o.name.toLowerCase().includes(q)) : this.filterOptions.queues;
  }

  get filteredChains(): RuleChainOption[] {
    if (!this.filterOptions) { return []; }
    const q = this.chainSearch.toLowerCase();
    return q ? this.filterOptions.ruleChains.filter(o => o.name.toLowerCase().includes(q)) : this.filterOptions.ruleChains;
  }

  get visibleNodes(): RuleNodeOption[] {
    if (!this.filterOptions) { return []; }
    let nodes = this.selectedChainIds.length
      ? this.filterOptions.ruleNodes.filter(n => this.selectedChainIds.includes(n.ruleChainId))
      : this.filterOptions.ruleNodes;
    const q = this.nodeSearch.toLowerCase();
    return q
      ? nodes.filter(n => n.name.toLowerCase().includes(q) || n.ruleChainName.toLowerCase().includes(q))
      : nodes;
  }

  ngOnInit(): void {
    this.emitFilterChange();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['locked'] && !this.locked) {
      this.compareActive = false;
    }
    if (changes['externalFilterState'] && this.externalFilterState) {
      this.selectedQueueIds = [...(this.externalFilterState.queueIds     ?? [])];
      this.selectedChainIds = [...(this.externalFilterState.ruleChainIds ?? [])];
      this.selectedNodeIds  = [...(this.externalFilterState.ruleNodeIds  ?? [])];
      const incoming = this.externalFilterState.serviceIds ?? [];
      if (incoming.length > 0) {
        this.selectedServiceId = incoming[0];
      }
    }
  }

  onTimeRangeChange(): void {
    if (this.activePreset === 'custom' && !this.customStart) {
      const now = new Date();
      this.customEnd = toDatetimeLocal(now);
      this.customStart = toDatetimeLocal(new Date(now.getTime() - DAY_MS));
    }
    this.emitFilterChange();
  }

  onCustomRangeChange(): void {
    if (this.customStart && this.customEnd) {
      this.emitFilterChange();
    }
  }

  onQueueChange(): void {
    this.emitFilterChange();
  }

  onChainChange(): void {
    if (this.selectedChainIds.length && this.filterOptions) {
      const allowed = new Set(
        this.filterOptions.ruleNodes
          .filter(n => this.selectedChainIds.includes(n.ruleChainId))
          .map(n => n.id)
      );
      this.selectedNodeIds = this.selectedNodeIds.filter(id => allowed.has(id));
    }
    this.emitFilterChange();
  }

  onNodeChange(): void {
    this.emitFilterChange();
  }

  onServiceCheckboxChange(): void {
    this.selectedServiceId = null;
    this.emitFilterChange();
  }

  onRefresh(): void {
    this.refreshClick.emit();
    this.emitFilterChange();
  }

  onReset(): void {
    if (this.locked) {
      // In compare mode the filter selections are locked — just signal the parent to reset
      this.resetClick.emit();
      return;
    }
    this.selectedQueueIds  = [];
    this.selectedChainIds  = [];
    this.selectedNodeIds   = [];
    this.selectedServiceId = null;
    this.queueSearch = '';
    this.chainSearch = '';
    this.nodeSearch  = '';
    this.emitFilterChange();
    this.resetClick.emit();
  }

  onCompareToggle(): void {
    this.compareActive = !this.compareActive;
    this.compareToggle.emit(this.compareActive);
  }

  private emitFilterChange(): void {
    const { startTs, endTs } = this.computeTimeRange();
    this.filterChange.emit({
      startTs,
      endTs,
      queueIds:    [...this.selectedQueueIds],
      ruleChainIds:[...this.selectedChainIds],
      ruleNodeIds: [...this.selectedNodeIds],
      serviceIds:  this.selectedServiceId !== null ? [this.selectedServiceId] : [],
    });
  }

  private computeTimeRange(): { startTs: number; endTs: number } {
    if (this.activePreset === 'custom' && this.customStart && this.customEnd) {
      return {
        startTs: new Date(this.customStart).getTime(),
        endTs: new Date(this.customEnd).getTime(),
      };
    }
    const preset = this.presets.find(p => p.value === this.activePreset) ?? this.presets[1];
    const endTs = Date.now();
    return { startTs: endTs - preset.ms, endTs };
  }
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
