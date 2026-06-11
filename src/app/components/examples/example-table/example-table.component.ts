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

import { Component, Input, OnInit } from '@angular/core';
import { WidgetContext } from '@home/models/widget-component.models';
import { isDefinedAndNotNull } from '@core/public-api';
import { DataKey, ValueFormatProcessor } from '@shared/public-api';

enum FormatKey {
  DECIMALS = 'decimals',
  UNITS = 'units'
}

@Component({
  selector: 'tb-example-table',
  templateUrl: 'example-table.component.html',
  styleUrls: ['example-table.component.scss'],
  standalone: false
})

export class ExampleTableComponent implements OnInit {

  @Input() ctx: WidgetContext;

  public tableValues: { [key: string]: any } = {};
  public entityName: string;

  private mapFomatValue = new Map<string, ValueFormatProcessor>();

  ngOnInit(): void {
    this.ctx.$scope.exampleTableComponent = this;
    this.entityName = this.ctx.datasources[0].entityName;
  }

  public onDataUpdated(): void {
    for (const key of this.ctx.data) {
      if (key.data.length) {
        const rowName: string = key.dataKey.label;
        let valueFormat: ValueFormatProcessor;
        if (this.mapFomatValue.has(rowName)) {
          valueFormat = this.mapFomatValue.get(rowName);
        } else {
          valueFormat = ValueFormatProcessor.fromSettings(this.ctx.$injector, {
            units: this.getFormatInfo<string>(key.dataKey, FormatKey.UNITS),
            decimals: this.getFormatInfo<number>(key.dataKey, FormatKey.DECIMALS)
          });
          this.mapFomatValue.set(rowName, valueFormat);
        }
        this.tableValues[rowName] = valueFormat.format(key.data[0][1]);
      }
    }
    this.ctx.detectChanges();
  }

  private getFormatInfo<T>(dataKey: DataKey, formatKey: FormatKey): T {
    let formatInfo = this.ctx[formatKey] as T;
    if (isDefinedAndNotNull(dataKey[formatKey])) {
      formatInfo = dataKey[formatKey] as T;
    }

    return formatInfo;
  }
}
