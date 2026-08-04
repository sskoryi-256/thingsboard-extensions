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

/** A single column of a ThingsBoard SQL domain view. */
export interface SqlFieldDefinition {
  name: string;
  type: string;
  description?: string;
}

/** Origin of a queryable relation. Analytics datasets are the only queryable surface. */
export type SqlViewSource = 'dataset';

/** One column of an analytics dataset, as returned by the datasets endpoints. */
export interface SqlDatasetColumn {
  name: string;
  source: string;
  type: string | null;
}

/** Synchronization status of an analytics dataset. */
export interface SqlDatasetSyncStatus {
  lastSyncTs: number | null;
  lastError: string | null;
}

/** An analytics dataset (matches SqlQueryController create/list responses). */
export interface SqlDatasetInfo {
  name: string;
  columns: SqlDatasetColumn[];
  syncStatus: SqlDatasetSyncStatus;
}

/** A ThingsBoard SQL domain view and its columns. */
export interface SqlViewDefinition {
  schema: string;
  name: string;
  description: string;
  fields: SqlFieldDefinition[];
  /** A ready-to-run example query for this relation. */
  example?: string;
  /** Origin of the relation (analytics dataset). */
  source: SqlViewSource;
}

/** Execution state of the query console. */
export type SqlQueryStatus = 'idle' | 'running' | 'success' | 'failed';

/** Result of the lightweight client-side read-only validation. */
export interface SqlValidationResult {
  valid: boolean;
  error?: string;
}

/** A single autocomplete suggestion. */
export interface SqlSuggestion {
  /** Text shown in the suggestion list. */
  label: string;
  /** Text inserted into the editor when the suggestion is accepted. */
  insertText: string;
  kind: 'keyword' | 'function' | 'view' | 'field';
  /** Optional short hint shown to the right of the label (e.g. field type). */
  detail?: string;
}

/** RBAC permission the backend verifies for a query (mirrors AccessControlService). */
export interface SqlPermission {
  resource: string;
  operation: string;
}

/** Page-level state coordinated by the console page component. */
export interface SqlConsoleState {
  query: string;
  loading: boolean;
  rows: Record<string, unknown>[];
  error: string | null;
  executionTimeMs: number | null;
}
