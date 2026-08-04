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

import { SqlSuggestion, SqlValidationResult, SqlViewDefinition } from './sql-schema.model';

export const SQL_KEYWORDS: string[] = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'ON',
  'GROUP BY', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'AS', 'AND', 'OR',
  'IN', 'BETWEEN', 'IS NULL', 'IS NOT NULL', 'WITH'
];

export const SQL_AGGREGATES: string[] = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];

/** Write statements rejected by the client-side check (feedback only; backend is authoritative). */
const WRITE_KEYWORDS = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];

export function fullViewName(view: SqlViewDefinition): string {
  // Datasets are referenced by their bare logical name (no schema prefix).
  return view.schema ? `${view.schema}.${view.name}` : view.name;
}

/**
 * Lightweight read-only validation for user feedback. The backend performs the
 * authoritative validation.
 */
export function validateReadOnlyQuery(rawQuery: string): SqlValidationResult {
  const withoutComments = stripSqlComments(rawQuery);
  let query = withoutComments.trim();
  if (!query) {
    return { valid: false, error: 'Query is empty.' };
  }
  // Allow a single trailing semicolon; strip it before the multi-statement check.
  query = query.replace(/;+\s*$/, '').trim();
  if (query.includes(';')) {
    return { valid: false, error: 'Multiple statements are not allowed.' };
  }
  const lower = query.toLowerCase();
  if (!(lower.startsWith('select') || lower.startsWith('with'))) {
    return { valid: false, error: 'Only SELECT / WITH queries are allowed.' };
  }
  for (const kw of WRITE_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(query)) {
      return { valid: false, error: `Write operation "${kw}" is not allowed.` };
    }
  }
  return { valid: true };
}

/** Max length of a logical business-view name (Postgres identifier limit). */
export const MAX_VIEW_NAME_LENGTH = 63;

/** Validates a logical business-view name (lowercase, starts with a letter, no schema prefix). */
export function validateViewName(rawName: string): SqlValidationResult {
  const name = (rawName ?? '').trim();
  if (!name) {
    return { valid: false, error: 'View name is required.' };
  }
  if (name.includes('.')) {
    return { valid: false, error: 'Do not include a schema prefix — enter just the view name.' };
  }
  if (/\s/.test(name)) {
    return { valid: false, error: 'View name must not contain spaces.' };
  }
  if (name.length > MAX_VIEW_NAME_LENGTH) {
    return { valid: false, error: `View name must be at most ${MAX_VIEW_NAME_LENGTH} characters.` };
  }
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    return { valid: false, error: 'Use lowercase letters, numbers and underscores; must start with a letter.' };
  }
  return { valid: true };
}

/**
 * Validates a business-view SELECT definition before submission (user feedback only —
 * the backend is authoritative). Enforces read-only single-statement SQL and rejects SQL
 * comments (the backend forbids them). The "only platform views" rule is NOT enforced here:
 * a regex cannot distinguish a CTE column reference (e.g. hierarchy.room_id) from a real
 * schema reference, so the backend's JSqlParser AST validator makes that decision.
 */
export function validateViewDefinition(query: string): SqlValidationResult {
  const base = validateReadOnlyQuery(query);
  if (!base.valid) {
    return base;
  }
  if (query.includes('--') || query.includes('/*') || query.includes('*/')) {
    return { valid: false, error: 'SQL comments are not permitted in a business view definition.' };
  }
  return { valid: true };
}

/** Removes SQL line and block comments so validation isn't fooled by commented-out text. */
function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

/** Result columns are inferred from the union of keys across rows (first row leads the order). */
export function buildResultColumns(rows: Record<string, unknown>[]): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows ?? []) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

/** Renders a cell value for display: null marker and JSON for objects/arrays. */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * When the backend reports an unqualified relation error (e.g. `relation "assets"
 * does not exist`) and that name matches a known domain view, returns the correction
 * so the UI can offer "did you mean thingsboard_sql.assets".
 */
export function suggestViewFromError(error: string | null, views: SqlViewDefinition[]): { bad: string; full: string } | null {
  if (!error) {
    return null;
  }
  const match = error.match(/relation\s+"([^"]+)"\s+does not exist/i);
  if (!match) {
    return null;
  }
  const bad = match[1];
  if (bad.includes('.')) {
    return null;
  }
  const view = views.find(v => v.name.toLowerCase() === bad.toLowerCase());
  return view ? { bad, full: fullViewName(view) } : null;
}

// ── Autocomplete ────────────────────────────────────────────────────────────

interface TokenContext {
  /** Partial word immediately before the caret (may be empty). */
  partial: string;
  /** Qualifier parts before the last dot, e.g. ['a'] for "a.te" or ['thingsboard_sql'] for "thingsboard_sql.". */
  qualifier: string[];
  /** Clause the caret sits in, based on the nearest preceding keyword. */
  clause: 'from' | 'join' | 'select' | 'where' | 'on' | 'orderby' | 'groupby' | 'other';
}

/**
 * Token-based, context-aware suggestions. Not a full SQL parser: it inspects the
 * text before the caret to bias suggestions (views after FROM/JOIN, fields after a
 * known alias/view and a dot, fields + aggregates after SELECT, etc.).
 */
export function getAutocompleteSuggestions(text: string, cursor: number, views: SqlViewDefinition[]): SqlSuggestion[] {
  const before = text.slice(0, Math.max(0, cursor));
  const ctx = tokenContext(before);
  const partialLower = ctx.partial.toLowerCase();

  // Dotted token: qualifier resolves either to the schema (→ view names) or to a view (→ fields).
  if (ctx.qualifier.length > 0) {
    const view = resolveQualifiedView(ctx.qualifier, before, views);
    if (view) {
      return view.fields
        .filter(f => f.name.toLowerCase().startsWith(partialLower))
        .map<SqlSuggestion>(f => ({ label: f.name, insertText: f.name, kind: 'field', detail: f.type }));
    }
    if (ctx.qualifier.length === 1 && ctx.qualifier[0].toLowerCase() === schemaOf(views)) {
      // "thingsboard_sql." → view names (insert only the view name, the schema is already typed).
      return views
        .filter(v => v.name.toLowerCase().startsWith(partialLower))
        .map<SqlSuggestion>(v => ({ label: fullViewName(v), insertText: v.name, kind: 'view', detail: 'view' }));
    }
    return [];
  }

  const suggestions: SqlSuggestion[] = [];
  const addKeywords = () => SQL_KEYWORDS.forEach(k => suggestions.push({ label: k, insertText: k, kind: 'keyword' }));
  const addAggregates = () => SQL_AGGREGATES.forEach(a => suggestions.push({ label: `${a}()`, insertText: `${a}()`, kind: 'function' }));
  const addViews = () => views.forEach(v => suggestions.push({ label: fullViewName(v), insertText: fullViewName(v), kind: 'view', detail: 'view' }));
  const addFields = () => allFields(views).forEach(f => suggestions.push({ label: f.name, insertText: f.name, kind: 'field', detail: f.type }));

  switch (ctx.clause) {
    case 'from':
    case 'join':
      addViews();
      break;
    case 'select':
      addFields();
      addAggregates();
      break;
    case 'where':
    case 'on':
    case 'orderby':
    case 'groupby':
      addFields();
      addKeywords();
      break;
    default:
      addKeywords();
      addViews();
      addFields();
      addAggregates();
      break;
  }

  const filtered = partialLower
    ? suggestions.filter(s => s.label.toLowerCase().startsWith(partialLower))
    : suggestions;
  return dedupe(filtered).slice(0, 50);
}

function schemaOf(views: SqlViewDefinition[]): string {
  return (views[0]?.schema ?? 'thingsboard_sql').toLowerCase();
}

function allFields(views: SqlViewDefinition[]): { name: string; type: string }[] {
  const seen = new Set<string>();
  const out: { name: string; type: string }[] = [];
  for (const v of views) {
    for (const f of v.fields) {
      if (!seen.has(f.name)) {
        seen.add(f.name);
        out.push({ name: f.name, type: f.type });
      }
    }
  }
  return out;
}

function dedupe(items: SqlSuggestion[]): SqlSuggestion[] {
  const seen = new Set<string>();
  return items.filter(i => {
    const key = `${i.kind}:${i.label}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/** Parses the current token before the caret into its qualifier parts and trailing partial word. */
function tokenContext(before: string): TokenContext {
  const match = before.match(/([A-Za-z0-9_.]*)$/);
  const token = match ? match[1] : '';
  const parts = token.split('.');
  const partial = parts[parts.length - 1];
  const qualifier = parts.slice(0, -1).filter(p => p.length > 0);
  return { partial, qualifier, clause: detectClause(before) };
}

/** Finds the nearest preceding SQL clause keyword to bias suggestions. */
function detectClause(before: string): TokenContext['clause'] {
  const upper = before.toUpperCase();
  const markers: { clause: TokenContext['clause']; re: RegExp }[] = [
    { clause: 'orderby', re: /\bORDER\s+BY\b/g },
    { clause: 'groupby', re: /\bGROUP\s+BY\b/g },
    { clause: 'join', re: /\bJOIN\b/g },
    { clause: 'from', re: /\bFROM\b/g },
    { clause: 'on', re: /\bON\b/g },
    { clause: 'where', re: /\bWHERE\b/g },
    { clause: 'select', re: /\bSELECT\b/g }
  ];
  let best: { clause: TokenContext['clause']; index: number } = { clause: 'other', index: -1 };
  for (const m of markers) {
    let match: RegExpExecArray | null;
    let last = -1;
    while ((match = m.re.exec(upper)) !== null) {
      last = match.index;
    }
    if (last > best.index) {
      best = { clause: m.clause, index: last };
    }
  }
  return best.clause;
}

/** Resolves a dotted qualifier ("a", "thingsboard_sql.assets", "assets") to a view definition. */
function resolveQualifiedView(qualifier: string[], before: string, views: SqlViewDefinition[]): SqlViewDefinition | null {
  const schema = schemaOf(views);
  if (qualifier.length === 2) {
    if (qualifier[0].toLowerCase() === schema) {
      return views.find(v => v.name.toLowerCase() === qualifier[1].toLowerCase()) ?? null;
    }
    return null;
  }
  if (qualifier.length === 1) {
    const q = qualifier[0].toLowerCase();
    // direct view short name
    const direct = views.find(v => v.name.toLowerCase() === q);
    if (direct) {
      return direct;
    }
    // alias declared in a FROM / JOIN clause
    const aliasView = aliasMap(before, views).get(q);
    return aliasView ?? null;
  }
  return null;
}

/** Builds alias → view map from FROM/JOIN clauses, e.g. "FROM thingsboard_sql.assets a". */
function aliasMap(text: string, views: SqlViewDefinition[]): Map<string, SqlViewDefinition> {
  const map = new Map<string, SqlViewDefinition>();
  const re = /\b(?:from|join)\s+([a-z0-9_]+)\.([a-z0-9_]+)(?:\s+(?:as\s+)?([a-z0-9_]+))?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const [, , viewName, alias] = match;
    const view = views.find(v => v.name.toLowerCase() === viewName.toLowerCase());
    if (!view) {
      continue;
    }
    if (alias && !isKeyword(alias)) {
      map.set(alias.toLowerCase(), view);
    }
    map.set(view.name.toLowerCase(), view);
  }
  return map;
}

function isKeyword(word: string): boolean {
  const w = word.toUpperCase();
  return SQL_KEYWORDS.includes(w) || w === 'ON' || w === 'WHERE' || w === 'GROUP' || w === 'ORDER' || w === 'LIMIT';
}
