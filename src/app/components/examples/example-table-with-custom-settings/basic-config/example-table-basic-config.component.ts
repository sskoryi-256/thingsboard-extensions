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

import { Component } from '@angular/core';
import { BasicWidgetConfigComponent } from '@home/components/public-api';
import { FormBuilder, FormGroup } from '@angular/forms';
import { WidgetConfigComponentData } from '@home/models/widget-component.models';
import { AppState } from '@core/public-api';
import { Store } from '@ngrx/store';
import { WidgetConfigComponent } from '@home/components/widget/widget-config.component';
import { DataKey, Datasource } from '@shared/public-api';

@Component({
  selector: 'tb-example-table-basic-config',
  templateUrl: './example-table-basic-config.component.html',
  styleUrls: [],
  standalone: false
})

export class ExampleTableBasicConfigComponent extends BasicWidgetConfigComponent {

  public exampleTableConfigForm: FormGroup;
  public basicMode = this.basicMode;

  public get datasource(): Datasource | null {
    const datasources: Datasource[] = this.exampleTableConfigForm.get('datasources').value;
    if (datasources && datasources.length) {
      return datasources[0];
    } else {
      return null;
    }
  }

  constructor(protected store: Store<AppState>,
              protected widgetConfigComponent: WidgetConfigComponent,
              private fb: FormBuilder) {
    super(store, widgetConfigComponent);
  }

  protected configForm(): FormGroup {
    return this.exampleTableConfigForm;
  }

  protected onConfigSet(configData: WidgetConfigComponentData): void {
    this.exampleTableConfigForm = this.fb.group({
      datasources: [configData.config.datasources, []],
      columns: [this.getColumns(configData.config.datasources), []],
      actions: [configData.config.actions || {}, []]
    });
  }

  protected prepareOutputConfig(config: any): WidgetConfigComponentData {
    this.widgetConfig.config.datasources = config.datasources;
    this.widgetConfig.config.actions = config.actions;
    this.setColumns(config.columns, this.widgetConfig.config.datasources);
    return this.widgetConfig;
  }

  private getColumns(datasources?: Datasource[]): DataKey[] {
    if (datasources && datasources.length) {
      return datasources[0].dataKeys || [];
    }
    return [];
  }


  private setColumns(columns: DataKey[], datasources?: Datasource[]) {
    if (datasources && datasources.length) {
      datasources[0].dataKeys = columns;
    }
  }

}
