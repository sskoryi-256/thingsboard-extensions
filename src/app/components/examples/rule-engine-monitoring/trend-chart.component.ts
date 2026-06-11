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

import {
  AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter,
  Injector, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild
} from '@angular/core';
import * as echarts from 'echarts/core';
import { EChartsOption } from 'echarts';
import { LineChart } from 'echarts/charts';
import { BrushComponent, DataZoomComponent, GridComponent, MarkAreaComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { combineLatest, Subscription } from 'rxjs';
import { FilterState, NodeTsEntry, QueueLagTsEntry, QueueTsEntry } from './rule-engine-monitoring.models';
import { RuleEngineMonitoringWidgetService, RuleEngineHttpError } from './rule-engine-monitoring.service';
import { formatAvgDuration, formatDuration } from './rule-engine-monitoring.utils';

interface SeriesDef {
  key: string;
  label: string;
  color: string;
  description: string;
}

const SERIES_DEFS: SeriesDef[] = [
  { key: 'execCount',        label: 'Rule Node Executions',              color: '#5470c6', description: 'Number of rule node executions per time bucket.' },
  { key: 'errorCount',       label: 'Rule Node Failed Executions',       color: '#ee6666', description: 'Number of failed rule node executions per time bucket.' },
  { key: 'timeoutCount',     label: 'Queue Timeout Count',               color: '#fac858', description: 'Timed out messages per time bucket.' },
  { key: 'lag',              label: 'Max Queue Lag',                     color: '#ee82ee', description: 'Highest one-queue lag per time bucket' },
  { key: 'avgDurationMs',    label: 'Avg Rule Node Duration',            color: '#91cc75', description: 'Average rule node execution duration per time bucket.' },
  { key: 'maxDurationMs',    label: 'Max Rule Node Duration',            color: '#9a60b4', description: 'Maximum rule node execution duration per time bucket.' },
  { key: 'totalDurationMs',  label: 'Total Rule Node Execution Duration', color: '#73c0de', description: 'Sum of rule node execution durations per time bucket.' },
];

const AXIS_GAP = 65;
const GRID_TOP = 12;
const GRID_BOTTOM = 36;

@Component({
  selector: 'tb-rem-trend-chart',
  templateUrl: './trend-chart.component.html',
  styleUrls: ['./trend-chart.component.scss'],
  standalone: false
})
export class TrendChartComponent implements OnChanges, AfterViewInit, OnDestroy {

  @ViewChild('chartContainer', { static: false }) chartContainer: ElementRef<HTMLElement>;

  @Input() filterState: FilterState | null = null;
  @Input() rangeSelectActive = false;
  @Input() compareActive = false;
  @Input() injector: Injector | null = null;

  @Output() rangeSelected = new EventEmitter<{ start: number; end: number }>();

  readonly intervals = [
    { label: '1m',  ms: 60_000 },
    { label: '5m',  ms: 300_000 },
    { label: '10m', ms: 600_000 },
    { label: '15m', ms: 900_000 },
    { label: '30m', ms: 1_800_000 },
    { label: '1h',  ms: 3_600_000 },
    { label: '1d',  ms: 86_400_000 },
  ];
  selectedIntervalMs = 3_600_000;

  readonly seriesDefs = SERIES_DEFS;
  seriesVisible: Record<string, boolean> = Object.fromEntries(SERIES_DEFS.map(d => [d.key, true]));

  loading = false;
  errorMessage: string | null = null;

  /** Blocking spinner only on the very first load; later refreshes update the chart in place. */
  get initialLoading(): boolean {
    return this.loading && this.lastNodeData.length === 0 && this.lastQueueData.length === 0 && this.lastLagData.length === 0;
  }

  private static readonly BRUSH_STYLE = {
    color: 'rgba(84,112,198,0.15)', borderColor: 'rgba(84,112,198,0.6)', borderWidth: 1,
  };

  private chart: echarts.EChartsType | null = null;
  private service: RuleEngineMonitoringWidgetService | null = null;
  private sub: Subscription | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastNodeData: NodeTsEntry[] = [];
  private lastQueueData: QueueTsEntry[] = [];
  private lastLagData: QueueLagTsEntry[] = [];

  // Brush-selection state
  private brushDone: 0 | 1 | 2 = 0;
  private firstBrushRange: [number, number] | null = null;

  constructor(private cdr: ChangeDetectorRef) {
    echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, BrushComponent, MarkAreaComponent, CanvasRenderer]);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['injector'] && this.injector && !this.service) {
      this.service = new RuleEngineMonitoringWidgetService(this.injector);
    }
    if (changes['compareActive'] && !this.compareActive && this.chart) {
      // Compare mode turned off — clear all overlays and reset state
      this.resetBrushState();
    }
    if (changes['rangeSelectActive'] && this.chart) {
      if (this.rangeSelectActive) {
        // Reset button pressed in compare mode — clear and re-enable brush
        this.resetBrushState();
      }
      this.updateBrushMode();
    }
    if (changes['filterState'] && this.filterState && this.service && this.chart) {
      this.fetch();
    }
  }

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartContainer.nativeElement, null, { renderer: 'canvas' });

    this.chart.on('brushEnd', (params: any) => {
      if (this.brushDone >= 2) return;

      const areas: any[] = params.areas ?? [];
      // In brushMode:'multiple', new brushes accumulate; always take the latest one
      const latestArea = areas[areas.length - 1];
      if (!latestArea) return;

      const range = latestArea.coordRange;
      if (!range || range.length !== 2) return;

      const start = Math.floor(Math.min(range[0], range[1]));
      const end   = Math.ceil(Math.max(range[0], range[1]));

      if (this.brushDone === 0) {
        // First brush: clear native overlay, draw blue markArea, emit
        this.brushDone = 1;
        this.firstBrushRange = [start, end];
        this.chart!.dispatchAction({ type: 'brush', areas: [] });
        this.applyMarkAreas([{ range: [start, end], color: 'blue' }]);
        this.rangeSelected.emit({ start, end });

      } else if (this.brushDone === 1) {
        // Second brush: clear native overlay, draw both markAreas, emit
        this.brushDone = 2;
        this.chart!.dispatchAction({ type: 'brush', areas: [] });
        this.applyMarkAreas([
          { range: this.firstBrushRange!, color: 'blue' },
          { range: [start, end],          color: 'orange' },
        ]);
        this.rangeSelected.emit({ start, end });
      }
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);

    this.chart.setOption(this.buildBaseOption());
    this.updateBrushMode();

    if (this.filterState && this.service) {
      this.fetch();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  onIntervalChange(): void {
    if (this.filterState && this.service && this.chart) {
      this.fetch();
    }
  }

  toggleSeries(key: string): void {
    this.seriesVisible[key] = !this.seriesVisible[key];
    if (!this.chart) return;

    const yAxes = this.buildYAxes();
    const grid = this.buildGrid();
    const series = SERIES_DEFS.map(def => ({
      id: def.key,
      data: this.seriesVisible[def.key]
        ? this.extractData(def.key, this.lastNodeData, this.lastQueueData, this.lastLagData)
        : [],
    }));
    this.chart.setOption({ yAxis: yAxes, grid, series }, { replaceMerge: ['yAxis', 'grid'] });
  }

  private fetch(): void {
    this.sub?.unsubscribe();
    this.loading = true;
    this.errorMessage = null;
    this.cdr.detectChanges();

    const filter = this.filterState!;
    this.sub = combineLatest([
      this.service!.getNodeStatsTimeseries(filter, this.selectedIntervalMs),
      this.service!.getQueueStatsTimeseries(filter, this.selectedIntervalMs),
      this.service!.getQueueLagStatsTimeseries(filter, this.selectedIntervalMs),
    ]).subscribe({
      next: ([nodeData, queueData, lagData]) => {
        this.applyData(nodeData, queueData, lagData);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: RuleEngineHttpError) => {
        this.loading = false;
        this.errorMessage = err?.status === 401 || err?.status === 403
          ? 'Access denied.'
          : 'Failed to load chart data.';
        this.cdr.detectChanges();
      }
    });
  }

  private applyData(nodeData: NodeTsEntry[], queueData: QueueTsEntry[], lagData: QueueLagTsEntry[]): void {
    if (!this.chart || !this.filterState) return;

    this.lastNodeData = nodeData;
    this.lastQueueData = queueData;
    this.lastLagData = lagData;

    const series = SERIES_DEFS.map(def => ({
      id: def.key,
      data: this.seriesVisible[def.key]
        ? this.extractData(def.key, nodeData, queueData, lagData)
        : [],
    }));

    this.chart.setOption({
      xAxis: { min: this.filterState.startTs, max: this.filterState.endTs },
      series,
    });
  }

  private extractData(key: string, nodeData: NodeTsEntry[], queueData: QueueTsEntry[], lagData: QueueLagTsEntry[]): [number, number][] {
    if (key === 'timeoutCount') {
      return queueData.map(d => [d.bucketTime, d.timeoutCount ?? 0]);
    }
    if (key === 'lag') {
      return lagData.map(d => [d.bucketTime, d.lag ?? 0]);
    }
    return nodeData.map(d => [d.bucketTime, (d as any)[key] ?? 0]);
  }

  private buildBaseOption(): EChartsOption {
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (params: any[]) => this.formatTooltip(params),
      },
      grid: this.buildGrid(),
      xAxis: {
        type: 'time',
        axisLabel: { color: 'rgba(0,0,0,0.54)', fontSize: 11, hideOverlap: true },
        splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.07)' } },
        axisLine: { lineStyle: { color: 'rgba(0,0,0,0.38)' } },
        axisTick: { lineStyle: { color: 'rgba(0,0,0,0.38)' } },
      },
      yAxis: this.buildYAxes(),
      series: [
        ...SERIES_DEFS.map((def, i) => ({
          id: def.key,
          name: def.label,
          type: 'line' as const,
          yAxisIndex: i,
          showSymbol: false,
          lineStyle: { color: def.color, width: 2 },
          itemStyle: { color: def.color },
          data: [],
        })),
        // Phantom series — holds markArea overlays, always invisible
        {
          id: 'rangeOverlay',
          type: 'line' as const,
          yAxisIndex: 0,
          data: [],
          lineStyle: { opacity: 0 },
          itemStyle: { opacity: 0 },
          symbol: 'none',
          silent: true,
          markArea: { silent: true, data: [] },
        },
      ],
      dataZoom: [
        { type: 'inside', filterMode: 'none' },
        { type: 'slider', bottom: 4, height: 20, showDetail: false, filterMode: 'none',
          borderColor: 'rgba(0,0,0,0.12)', fillerColor: 'rgba(0,0,0,0.06)' },
      ],
      brush: {
        xAxisIndex: 0,
        brushMode: 'multiple',
        brushStyle: TrendChartComponent.BRUSH_STYLE,
      },
    };
  }

  private buildYAxes(): any[] {
    let leftOff = 0;

    return SERIES_DEFS.map((def, i) => {
      const visible = this.seriesVisible[def.key];
      let offset = 0;

      if (visible) {
        offset = leftOff;
        leftOff += AXIS_GAP;
      }

      return {
        type: 'value',
        id: def.key,
        show: visible,
        position: 'left',
        offset,
        min: 0,
        splitLine: { show: i === 0 },
        axisLabel: {
          color: def.color,
          fontSize: 10,
          formatter: (v: number) => this.formatSeriesValue(def.key, v),
        },
        axisLine: { show: true, lineStyle: { color: def.color } },
        axisTick: { show: true, lineStyle: { color: def.color } },
      };
    });
  }

  private buildGrid(): any {
    let leftTotal = 0;
    SERIES_DEFS.forEach(def => {
      if (this.seriesVisible[def.key]) leftTotal += AXIS_GAP;
    });
    return { left: Math.max(40, leftTotal + 10), right: 20, top: GRID_TOP, bottom: GRID_BOTTOM };
  }

  private updateBrushMode(): void {
    if (!this.chart) return;
    if (this.rangeSelectActive) {
      this.chart.dispatchAction({ type: 'takeGlobalCursor', key: 'brush', brushOption: { brushType: 'lineX', brushMode: 'multiple' } });
    } else {
      this.chart.dispatchAction({ type: 'takeGlobalCursor', key: '' });
    }
  }

  /** Reset all brush/overlay state and clear visuals. Called on reset and compare-off. */
  private resetBrushState(): void {
    this.brushDone = 0;
    this.firstBrushRange = null;
    this.clearMarkAreas();
    this.chart?.dispatchAction({ type: 'brush', areas: [] });
    this.chart?.setOption({ brush: { brushStyle: TrendChartComponent.BRUSH_STYLE } });
  }

  private applyMarkAreas(areas: { range: [number, number]; color: 'blue' | 'orange' }[]): void {
    if (!this.chart) return;
    const data = areas.map(a => [
      {
        xAxis: a.range[0],
        itemStyle: {
          color:       a.color === 'blue' ? 'rgba(84,112,198,0.15)' : 'rgba(255,152,0,0.15)',
          borderColor: a.color === 'blue' ? 'rgba(84,112,198,0.6)'  : 'rgba(255,152,0,0.7)',
          borderWidth: 1,
        },
      },
      { xAxis: a.range[1] },
    ]);
    this.chart.setOption({ series: [{ id: 'rangeOverlay', markArea: { silent: true, data } }] });
  }

  private clearMarkAreas(): void {
    this.chart?.setOption({ series: [{ id: 'rangeOverlay', markArea: { data: [] } }] });
  }

  // ── Formatting helpers ───────────────────────────────────────────────────

  private formatSeriesValue(key: string, v: number): string {
    if (key === 'avgDurationMs') return formatAvgDuration(v);
    if (key === 'maxDurationMs') return formatDuration(v);
    if (key === 'totalDurationMs') return formatDuration(v);
    return String(Math.round(v));
  }

  private formatTooltip(params: any[]): string {
    if (!params.length) return '';
    const ts = params[0].value[0];
    const date = new Date(ts).toLocaleString('en-GB', { hour12: false });
    let html = `<div style="font-size:11px;color:rgba(0,0,0,0.54);margin-bottom:4px">${date}</div>`;
    for (const p of params) {
      const def = SERIES_DEFS.find(d => d.label === p.seriesName);
      if (!def) continue;
      const val = this.formatSeriesValue(def.key, p.value[1]);
      html += `<div style="display:flex;gap:8px;align-items:center;margin-top:2px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0"></span>
        <span style="font-size:12px;color:rgba(0,0,0,0.76)">${p.seriesName}</span>
        <span style="margin-left:auto;font-weight:500;font-size:12px;padding-left:16px">${val}</span>
      </div>`;
    }
    return html;
  }
}
