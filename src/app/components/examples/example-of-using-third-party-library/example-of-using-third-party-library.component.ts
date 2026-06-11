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

import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { WidgetContext } from '@home/models/widget-component.models';

@Component({
  selector: 'tb-example-of-using-third-party-library',
  templateUrl: './example-of-using-third-party-library.component.html',
  styleUrls: [],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})

export class ExampleOfUsingThirdPartyLibraryComponent implements OnInit {

  @Input() ctx: WidgetContext;

  public options: any;
  public data: any;

  ngOnInit(): void {
    this.ctx.$scope.exampleTableComponent = this;
    this.options = {
      animation: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true
          }
        }
      }
    };
  }

  public onDataUpdated(): void {
    const data: any = {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: []
      }]
    };

    for (const key of this.ctx.data) {
      if (key.data.length) {
        data.labels.push(key.dataKey.label);
        data.datasets[0].data.push(key.data[0][1]);
        data.datasets[0].backgroundColor.push(key.dataKey.color);
      }
    }

    this.data = data;
    this.ctx.detectChanges();
  }
}
