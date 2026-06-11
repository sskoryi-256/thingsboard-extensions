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
import { FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ColorSettings, constantColor, WidgetSettings, WidgetSettingsComponent } from '@shared/public-api';
import { AppState } from '@core/core.state';

interface KeySettings {
  showIcon: boolean;
  iconSize: number;
  iconSizeUnit: string;
  icon: string;
  iconColor: ColorSettings;
}

@Component({
  selector: 'tb-example-table-key-settings',
  templateUrl: './data-key-settings.component.html',
  styleUrls: [],
  standalone: false
})

export class DataKeySettingsComponent extends WidgetSettingsComponent {

  private defaultSettingsValue: KeySettings = {
    showIcon: false,
    iconSize: 30,
    iconSizeUnit: 'px',
    icon: 'thermostat',
    iconColor: constantColor('#5469FF')
  };

  public keySettingsForm: FormGroup;

  constructor(protected store: Store<AppState>,
              private fb: FormBuilder) {
    super(store);
  }

  protected settingsForm(): FormGroup {
    return this.keySettingsForm;
  }

  protected defaultSettings(): WidgetSettings {
    return this.defaultSettingsValue;
  }

  protected onSettingsSet(settings: WidgetSettings) {
    this.keySettingsForm = this.fb.group({
      showIcon: [settings.showIcon, []],
      icon: [settings.icon, []],
      iconSize: [settings.iconSize, []],
      iconSizeUnit: [settings.iconSizeUnit, []],
      iconColor: [settings.iconColor, []]
    });
  }

}
