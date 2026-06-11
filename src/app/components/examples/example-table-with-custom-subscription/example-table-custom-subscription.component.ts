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
import { formatValue, WidgetSubscriptionOptions } from '@core/public-api';
import {
  AliasFilterType,
  BooleanOperation,
  DataKeyType,
  Datasource,
  DatasourceType,
  EntityKeyType,
  EntityKeyValueType,
  EntityType,
  FilterPredicateType,
  widgetType
} from '@shared/public-api';

@Component({
  selector: 'tb-example-table-custom-subscription',
  templateUrl: './example-table-custom-subscription.component.html',
  styleUrls: ['./example-table-custom-subscription.component.scss'],
  standalone: false
})

export class ExampleTableCustomSubscriptionComponent implements OnInit {

  @Input() ctx: WidgetContext;

  public tableValues: { [key: string]: any } = {};

  ngOnInit(): void {
    const datasources: Datasource[] = [
      {
        type: DatasourceType.entity,
        dataKeys: [
          {
            decimals: 0,
            label: 'Temperature',
            name: 'temperature',
            settings: {},
            type: DataKeyType.attribute
          }
        ],
        entityFilter:
          {
            type: AliasFilterType.entityType,
            entityType: EntityType.DEVICE
          },
        keyFilters: [
          {
            key: {
              key: 'active',
              type: EntityKeyType.ATTRIBUTE
            },
            predicate: {
              operation: BooleanOperation.EQUAL,
              type: FilterPredicateType.BOOLEAN,
              value: {
                defaultValue: true
              }
            },
            valueType: EntityKeyValueType.BOOLEAN
          }
        ]
      }
    ];

    const options: WidgetSubscriptionOptions = {
      type: widgetType.latest,
      datasources,
      callbacks:
        {
          onDataUpdated: () => {
            this.onDataUpdated();
          }
        }
    };

    this.ctx.subscriptionApi.createSubscription(options, true).subscribe(
      (subscription) => {
        this.ctx.defaultSubscription = subscription;
        this.ctx.data = subscription.data;
        this.ctx.datasources = subscription.datasources;
      }
    );
  }

  private onDataUpdated() {
    for (const key of this.ctx.data) {
      if (key.data.length) {
        const rowName: string = key.datasource.entity.name;
        const rowValue: string = formatValue(key.data[0][1], 2, '°C', false);
        this.tableValues[rowName] = rowValue;
      }
    }
    this.ctx.detectChanges();
  }
}
