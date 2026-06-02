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

import { ChangeDetectorRef, Component, Input, Injector, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CompareState, FilterState, MergedStatsDelta, MergedStatsTableRow } from './rule-engine-monitoring.models';
import { RuleEngineMonitoringWidgetService, RuleEngineHttpError } from './rule-engine-monitoring.service';
import { comparisonLabel, formatAvgDuration, formatDuration, METRIC_POLARITY } from './rule-engine-monitoring.utils';

interface KpiMetrics {
  totalExecs: number;
  totalErrors: number;
  successRate: number;
  timeoutCount: number;
  avgDurationMs: number;
  totalDurationMs: number;
}

interface KpiCard {
  key: string;
  label: string;
  primaryValue: string;      // compareValue (or raw value in non-compare mode)
  beforeValue: string | null; // "Before: {baseValue}"
  deltaLabel: string | null;  // "Δ +123 (+12.3%)" / "Δ +16,120" / null
  deltaColour: 'green' | 'red' | 'neutral' | null;
}

@Component({
  selector: 'tb-rem-kpi-cards',
  templateUrl: './kpi-cards.component.html',
  styleUrls: ['./kpi-cards.component.scss'],
  standalone: false
})
export class KpiCardsComponent implements OnChanges, OnDestroy {

  @Input() filterState: FilterState | null = null;
  @Input() compareState: CompareState | null = null;
  @Input() injector: Injector | null = null;

  cards: KpiCard[] = [];
  loading = false;
  errorMessage: string | null = null;

  private service: RuleEngineMonitoringWidgetService | null = null;
  private sub: Subscription | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['injector'] && this.injector && !this.service) {
      this.service = new RuleEngineMonitoringWidgetService(this.injector);
    }
    if ((changes['filterState'] || changes['compareState']) && this.filterState && this.service) {
      this.fetch();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private fetch(): void {
    this.sub?.unsubscribe();
    this.errorMessage = null;

    // Compare mode active but no range brushed yet — show N/A without fetching
    if (this.compareState !== null && this.compareState.baseRange === null) {
      this.loading = false;
      this.cards = this.buildCards(this.naMetrics(), null);
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const filter: FilterState = this.compareState?.baseRange
      ? { ...this.filterState!, startTs: this.compareState.baseRange.startTs, endTs: this.compareState.baseRange.endTs }
      : this.filterState!;
    const cmpFilter: FilterState | undefined = this.compareState?.compareRange
      ? { ...this.filterState!, startTs: this.compareState.compareRange.startTs, endTs: this.compareState.compareRange.endTs }
      : undefined;

    if (cmpFilter) {
      this.sub = this.service!.getStatsTableCompare(filter, cmpFilter).subscribe({
        next: (deltaRows: MergedStatsDelta[]) => {
          this.cards = this.buildCards(
            this.computeMetrics(deltaRows.map(r => this.toBaseRow(r))),
            this.computeMetrics(deltaRows.map(r => this.toCompareRow(r)))
          );
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err: RuleEngineHttpError) => this.handleError(err)
      });
    } else {
      this.sub = this.service!.getStatsTable(filter).subscribe({
        next: (rows: MergedStatsTableRow[]) => {
          this.cards = this.buildCards(this.computeMetrics(rows), null);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err: RuleEngineHttpError) => this.handleError(err)
      });
    }
  }

  private toBaseRow(r: MergedStatsDelta): MergedStatsTableRow {
    return {
      queueId: r.queueId, ruleChainId: r.ruleChainId, ruleNodeId: r.ruleNodeId, serviceId: r.serviceId,
      execCount: r.execCount.baseValue, errorCount: r.errorCount.baseValue,
      totalDurationMs: r.totalDurationMs.baseValue, avgDurationMs: r.avgDurationMs.baseValue,
      p95DurationMs: r.p95DurationMs.baseValue, timeoutCount: r.timeoutCount.baseValue,
    };
  }

  private toCompareRow(r: MergedStatsDelta): MergedStatsTableRow {
    return {
      queueId: r.queueId, ruleChainId: r.ruleChainId, ruleNodeId: r.ruleNodeId, serviceId: r.serviceId,
      execCount: r.execCount.compareValue, errorCount: r.errorCount.compareValue,
      totalDurationMs: r.totalDurationMs.compareValue, avgDurationMs: r.avgDurationMs.compareValue,
      p95DurationMs: r.p95DurationMs.compareValue, timeoutCount: r.timeoutCount.compareValue,
    };
  }

  private computeMetrics(rows: MergedStatsTableRow[]): KpiMetrics {
    let execSum = 0;
    let errorSum = 0;
    let durSum = 0;
    let toSum = 0;
    for (const row of rows) {
      execSum  += row.execCount       ?? 0;
      errorSum += row.errorCount      ?? 0;
      durSum   += row.totalDurationMs ?? 0;
      toSum    += row.timeoutCount    ?? 0;
    }

    return {
      totalExecs:      execSum,
      totalErrors:     errorSum,
      totalDurationMs: durSum,
      timeoutCount:    toSum,
      successRate:     execSum > 0 ? (execSum - errorSum) / execSum * 100 : 0,
      avgDurationMs:   execSum > 0 ? durSum / execSum : 0,
    };
  }

  private buildCards(current: KpiMetrics, compare: KpiMetrics | null): KpiCard[] {
    const fmtNum  = (v: number | null): string => (v ?? 0).toLocaleString();
    const fmtDur  = (v: number | null): string => formatDuration(v ?? 0);
    const fmtRate = (v: number | null): string => `${(v ?? 0).toFixed(1)}%`;

    const card = (
      key: string,
      label: string,
      cur: number | null,
      cmp: number | null | undefined,
      fmt: (v: number | null) => string
    ): KpiCard => {
      if (compare === null) {
        return { key, label, primaryValue: fmt(cur), beforeValue: null, deltaLabel: null, deltaColour: null };
      }

      const base = (cur === null || isNaN(cur as number)) ? 0 : cur as number;
      const comp = (cmp === null || cmp === undefined || isNaN(cmp as number)) ? 0 : cmp as number;
      const lowerIsBetter = METRIC_POLARITY[key] ?? true;

      if (base === 0 && comp === 0) {
        return { key, label, primaryValue: fmt(0), beforeValue: `Before: ${fmt(0)}`, deltaLabel: null, deltaColour: null };
      }

      if (base === 0) {
        const colour = lowerIsBetter ? 'red' : 'green';
        return { key, label, primaryValue: fmt(comp), beforeValue: `Before: ${fmt(0)}`, deltaLabel: `Δ +${fmt(comp)}`, deltaColour: colour };
      }

      const delta  = comp - base;
      const pct    = delta / base * 100;
      const colour = delta === 0 ? 'neutral' : comparisonLabel(pct, lowerIsBetter).colour;
      const sign   = delta > 0 ? '+' : '-';
      const deltaLabel = delta === 0
        ? null
        : `Δ ${sign}${fmt(Math.abs(delta))} (${delta > 0 ? '+' : ''}${pct.toFixed(1)}%)`;

      return { key, label, primaryValue: fmt(comp), beforeValue: `Before: ${fmt(base)}`, deltaLabel, deltaColour: colour };
    };

    return [
      card('totalExecs',        'Total Rule Node Executions',          current.totalExecs,    compare?.totalExecs,    fmtNum),
      card('totalFailedExecs',  'Total Rule Node Failed Executions',   current.totalErrors,   compare?.totalErrors,   fmtNum),
      card('successRate',       'Rule Node Success Rate',    current.successRate,   compare?.successRate,   fmtRate),
      card('queueTimeoutCount', 'Queue Timeout Count',       current.timeoutCount,  compare?.timeoutCount,  fmtNum),
      card('avgDuration',       'Avg Rule Node Execution Duration',    current.avgDurationMs, compare?.avgDurationMs, (v) => formatAvgDuration(v ?? 0)),
      card('totalProcessingTime','Total Rule Node Execution Duration',    current.totalDurationMs, compare?.totalDurationMs, fmtDur),
    ];
  }

  private handleError(err: RuleEngineHttpError): void {
    this.loading = false;
    this.errorMessage = err?.status === 401 || err?.status === 403
      ? 'Access denied. Please log in with sufficient permissions.'
      : 'Failed to load metrics.';
    this.cdr.detectChanges();
  }

  private naMetrics(): KpiMetrics {
    return { totalExecs: 0, totalErrors: 0, successRate: 0, timeoutCount: 0, avgDurationMs: 0, totalDurationMs: 0 };
  }
}
