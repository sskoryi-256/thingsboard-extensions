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

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SharedModule } from '@shared/public-api';
import {
  BasicWidgetConfigModule,
  HomeComponentsModule,
  WidgetConfigComponentsModule
} from '@home/components/public-api';
import { RuleEngineMonitoringComponent } from './rule-engine-monitoring/rule-engine-monitoring.component';
import { FilterBarComponent } from './rule-engine-monitoring/filter-bar.component';
import { KpiCardsComponent } from './rule-engine-monitoring/kpi-cards.component';
import { TrendChartComponent } from './rule-engine-monitoring/trend-chart.component';
import { StatTableComponent } from './rule-engine-monitoring/stat-table.component';
import { ExecutionPathsComponent } from './rule-engine-monitoring/execution-paths.component';
import { TracingComponent } from './rule-engine-monitoring/tracing.component';
import { TracesComponent } from './rule-engine-monitoring/traces.component';
import { TraceDetailsComponent } from './rule-engine-monitoring/trace-details.component';
import { PaginatorComponent } from './rule-engine-monitoring/paginator.component';
import { TimeRangeSelectorComponent } from './rule-engine-monitoring/time-range-selector.component';
import { SqlConsolePageComponent } from './sql-console/sql-console-page.component';
import { SqlSchemaBrowserComponent } from './sql-console/sql-schema-browser/sql-schema-browser.component';
import { SqlQueryConsoleComponent } from './sql-console/sql-query-console/sql-query-console.component';
import { SqlQueryResultComponent } from './sql-console/sql-query-result/sql-query-result.component';

@NgModule({
  declarations: [
    RuleEngineMonitoringComponent,
    FilterBarComponent,
    KpiCardsComponent,
    TrendChartComponent,
    StatTableComponent,
    ExecutionPathsComponent,
    TracingComponent,
    TracesComponent,
    TraceDetailsComponent,
    PaginatorComponent,
    TimeRangeSelectorComponent,
    SqlConsolePageComponent,
    SqlSchemaBrowserComponent,
    SqlQueryConsoleComponent,
    SqlQueryResultComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    HomeComponentsModule,
    BasicWidgetConfigModule,
    WidgetConfigComponentsModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  exports: [
    RuleEngineMonitoringComponent,
    FilterBarComponent,
    KpiCardsComponent,
    TrendChartComponent,
    StatTableComponent,
    ExecutionPathsComponent,
    TracingComponent,
    TracesComponent,
    TraceDetailsComponent,
    PaginatorComponent,
    SqlConsolePageComponent,
    SqlSchemaBrowserComponent,
    SqlQueryConsoleComponent,
    SqlQueryResultComponent,
  ]
})
export class ExamplesModule {
}
