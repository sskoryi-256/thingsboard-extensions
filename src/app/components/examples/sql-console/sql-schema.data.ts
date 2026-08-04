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

import { SqlDatasetInfo, SqlViewDefinition } from './sql-schema.model';

/**
 * Prepopulated query shown when the console first opens. Analytics datasets are the
 * only queryable relations and are referenced by their bare logical name.
 */
export const INITIAL_QUERY =
  `SELECT *\nFROM rooms\nLIMIT 100;`;

/**
 * Maps an analytics dataset (from GET /api/sql/datasets) to a schema-browser / autocomplete
 * entry. Datasets are referenced by their bare logical name (no schema prefix), so {@code schema}
 * is empty; {@link fullViewName} renders the bare name accordingly.
 */
export function datasetViewDefinition(info: SqlDatasetInfo): SqlViewDefinition {
  const synced = info.syncStatus?.lastSyncTs
    ? `last synced ${new Date(info.syncStatus.lastSyncTs).toLocaleString()}`
    : 'not yet synced';
  const error = info.syncStatus?.lastError ? ` — last error: ${info.syncStatus.lastError}` : '';
  return {
    schema: '',
    name: info.name,
    description: `Analytics dataset (${synced})${error}.`,
    fields: (info.columns ?? []).map(c => ({ name: c.name, type: c.type ?? 'text', description: c.source })),
    source: 'dataset',
    example: `SELECT *\nFROM ${info.name}\nLIMIT 100;`
  };
}
