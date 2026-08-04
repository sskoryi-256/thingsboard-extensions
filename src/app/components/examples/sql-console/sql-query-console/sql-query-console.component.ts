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

import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { SqlSuggestion, SqlViewDefinition } from '../sql-schema.model';
import { getAutocompleteSuggestions, validateReadOnlyQuery } from '../sql-console.utils';

@Component({
  selector: 'tb-sql-query-console',
  templateUrl: './sql-query-console.component.html',
  styleUrls: ['./sql-query-console.component.scss'],
  standalone: false
})
export class SqlQueryConsoleComponent {

  @Input() query = '';
  @Output() queryChange = new EventEmitter<string>();

  @Input() views: SqlViewDefinition[] = [];
  @Input() running = false;
  /** When true, hides the toolbar and hint so the editor can be embedded (e.g. in a dialog). */
  @Input() embedded = false;

  @Output() runQuery = new EventEmitter<string>();

  @ViewChild('editor', { static: true }) private editorRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('gutter', { static: true }) private gutterRef!: ElementRef<HTMLElement>;

  validationError: string | null = null;

  suggestions: SqlSuggestion[] = [];
  showSuggestions = false;
  activeIndex = 0;
  popupTop = 0;
  popupLeft = 0;

  currentLine = 1;

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /** Line numbers for the gutter, derived from the current query. */
  get lineNumbers(): number[] {
    const count = Math.max(1, (this.query ?? '').split('\n').length);
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  trackLine(_index: number, line: number): number {
    return line;
  }

  onQueryInput(value: string): void {
    this.query = value;
    this.queryChange.emit(value);
    this.validationError = null;
    this.updateGutter();
    this.updateSuggestions();
  }

  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.closeSuggestions();
      this.run();
      return;
    }
    if (!this.showSuggestions) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex = (this.activeIndex + 1) % this.suggestions.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex = (this.activeIndex - 1 + this.suggestions.length) % this.suggestions.length;
        break;
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        this.acceptSuggestion(this.activeIndex);
        break;
      case 'Escape':
        event.preventDefault();
        this.closeSuggestions();
        break;
      default:
        break;
    }
  }

  onCaretMove(): void {
    this.updateGutter();
    this.updateSuggestions();
  }

  onScroll(): void {
    const textarea = this.editorRef?.nativeElement;
    const gutter = this.gutterRef?.nativeElement;
    if (textarea && gutter) {
      gutter.scrollTop = textarea.scrollTop;
    }
  }

  onBlur(): void {
    // Delay so a mousedown on a suggestion is processed before the popup closes.
    this.hideTimer = setTimeout(() => this.closeSuggestions(), 150);
  }

  run(): void {
    const result = validateReadOnlyQuery(this.query);
    if (!result.valid) {
      this.validationError = result.error ?? 'Invalid query.';
      return;
    }
    this.validationError = null;
    this.runQuery.emit(this.query);
  }

  clear(): void {
    this.setQuery('');
    this.validationError = null;
    this.focusEditor(0);
  }

  format(): void {
    this.setQuery(this.formatSql(this.query));
    this.focusEditor();
  }

  /** Replaces the whole editor content (used by the schema browser "Use query" action). */
  loadQuery(text: string): void {
    this.setQuery(text);
    this.validationError = null;
    const textarea = this.editorRef?.nativeElement;
    if (textarea) {
      // Write the DOM value directly so the change is visible immediately, regardless of
      // input-binding timing.
      textarea.value = text;
    }
    this.focusEditor(text.length);
  }

  /** Inserts text at the current caret position (used by the schema browser). */
  insertAtCursor(text: string): void {
    const textarea = this.editorRef?.nativeElement;
    const value = this.query ?? '';
    const start = textarea ? textarea.selectionStart : value.length;
    const end = textarea ? textarea.selectionEnd : value.length;
    const needsLeadingSpace = start > 0 && !/\s/.test(value.charAt(start - 1));
    const insert = (needsLeadingSpace ? ' ' : '') + text;
    const next = value.slice(0, start) + insert + value.slice(end);
    this.setQuery(next);
    this.focusEditor(start + insert.length);
  }

  /** Replaces an unqualified relation name (e.g. "assets") with its full name. */
  fixRelation(bad: string, full: string): void {
    if (!bad || !full) {
      return;
    }
    const re = new RegExp(`(^|[^.\\w])(${escapeRegExp(bad)})\\b`, 'gi');
    const next = (this.query ?? '').replace(re, (_m, prefix) => `${prefix}${full}`);
    this.setQuery(next);
    this.validationError = null;
    this.focusEditor();
  }

  acceptSuggestion(index: number): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    const suggestion = this.suggestions[index];
    if (!suggestion) {
      return;
    }
    const textarea = this.editorRef.nativeElement;
    const pos = textarea.selectionStart;
    const value = this.query;
    const before = value.slice(0, pos);
    const after = value.slice(pos);

    const tokenMatch = before.match(/([A-Za-z0-9_.]*)$/);
    const token = tokenMatch ? tokenMatch[1] : '';
    const tokenStart = pos - token.length;
    // For dotted tokens (alias.field, schema.view) replace only the part after the last dot.
    const dot = token.lastIndexOf('.');
    const replaceStart = dot >= 0 ? tokenStart + dot + 1 : tokenStart;

    const next = value.slice(0, replaceStart) + suggestion.insertText + after;
    this.setQuery(next);
    this.focusEditor(replaceStart + suggestion.insertText.length);
  }

  private updateGutter(): void {
    const textarea = this.editorRef?.nativeElement;
    if (!textarea) {
      return;
    }
    const upToCaret = (this.query ?? '').slice(0, textarea.selectionStart);
    this.currentLine = upToCaret.split('\n').length;
    this.onScroll();
  }

  private updateSuggestions(): void {
    const textarea = this.editorRef?.nativeElement;
    if (!textarea) {
      this.closeSuggestions();
      return;
    }
    const pos = textarea.selectionStart;
    const before = (this.query ?? '').slice(0, pos);
    const tokenMatch = before.match(/([A-Za-z0-9_.]*)$/);
    const token = tokenMatch ? tokenMatch[1] : '';
    if (token.length === 0 && !before.endsWith('.')) {
      this.closeSuggestions();
      return;
    }
    const suggestions = getAutocompleteSuggestions(this.query ?? '', pos, this.views);
    if (!suggestions.length) {
      this.closeSuggestions();
      return;
    }
    this.suggestions = suggestions;
    this.activeIndex = 0;
    this.showSuggestions = true;
    const coords = this.caretCoordinates(textarea, pos);
    this.popupTop = coords.top + textarea.offsetTop;
    this.popupLeft = coords.left + textarea.offsetLeft;
  }

  private closeSuggestions(): void {
    this.showSuggestions = false;
    this.suggestions = [];
    this.activeIndex = 0;
  }

  private setQuery(value: string): void {
    this.query = value;
    this.queryChange.emit(value);
  }

  private focusEditor(caret?: number): void {
    setTimeout(() => {
      const textarea = this.editorRef?.nativeElement;
      if (!textarea) {
        return;
      }
      textarea.focus();
      if (caret !== undefined) {
        textarea.setSelectionRange(caret, caret);
      }
      this.updateGutter();
    });
  }

  /** Naive read-only formatter: newline before major clauses. Intentionally simple. */
  private formatSql(sql: string): string {
    const clauses = ['FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'LEFT JOIN', 'INNER JOIN', 'JOIN', 'ON'];
    let result = sql.replace(/\s+/g, ' ').trim();
    for (const clause of clauses) {
      result = result.replace(new RegExp(`\\s+${clause}\\b`, 'gi'), `\n${clause}`);
    }
    return result;
  }

  /**
   * Computes the pixel position of the caret within the textarea using a hidden mirror
   * element that copies the textarea's text metrics. Used to anchor the autocomplete popup.
   */
  private caretCoordinates(textarea: HTMLTextAreaElement, position: number): { top: number; left: number } {
    const style = window.getComputedStyle(textarea);
    const mirror = document.createElement('div');
    const props = [
      'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform'
    ];
    for (const prop of props) {
      (mirror.style as unknown as Record<string, string>)[prop] = style.getPropertyValue(camelToKebab(prop));
    }
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.top = '0';
    mirror.style.left = '0';
    mirror.textContent = textarea.value.slice(0, position);

    const marker = document.createElement('span');
    marker.textContent = '\u200b';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const top = marker.offsetTop - textarea.scrollTop + parseFloat(style.lineHeight || '16');
    const left = marker.offsetLeft - textarea.scrollLeft;
    document.body.removeChild(mirror);

    return { top: Math.max(0, top), left: Math.max(0, left) };
  }
}

function camelToKebab(value: string): string {
  return value.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
