# SQL Console (ThingsBoard SQL interface UI)

A minimal Angular UI for the ThingsBoard SQL interface. It lets a user browse the
available SQL **domain views**, write read-only SQL, run it through the platform
SQL endpoint, and inspect the result as a table.

## Layout

```
┌─────────────────────┬──────────────────────────────────────┐
│ SQL domain views    │ SQL query console (editor + toolbar) │
│  (schema browser)   ├──────────────────────────────────────┤
│  filter + expanders │ Query result (dynamic table)         │
└─────────────────────┴──────────────────────────────────────┘
```

- **Left** — `SqlSchemaBrowserComponent`: filterable, expandable list of the five
  `thingsboard_sql.*` views. Clicking a view name inserts its full name into the
  editor; clicking a field inserts the field name (both at the caret).
- **Right top** — `SqlQueryConsoleComponent`: a monospace editor with token-based
  autocomplete, `Run`/`Clear`/`Format`, execution status, and duration.
- **Right bottom** — `SqlQueryResultComponent`: the result table (gets most of the
  vertical height). The schema browser is resizable (drag its right edge) and the
  layout stacks on screens ≤ 800 px.

## Files

```
sql-console/
├── sql-console-page.component.*        coordinator (state + wiring)
├── sql-schema-browser/                 schema browser (analytics datasets)
├── sql-query-console/                  editor + autocomplete (embeddable)
├── sql-query-result/                   result table
├── sql-query.service.ts                GET /api/sql/datasets, POST /api/sql/query
├── sql-console.utils.ts                validation, columns, autocomplete (pure fns)
├── sql-schema.model.ts                 interfaces
└── sql-schema.data.ts                  static schema (initial query + dataset mapping)
```

## How to open the UI

The components follow the ThingsBoard extension convention: they are declared and
exported by `ExamplesModule` and re-exported from the extensions `public-api`, so
they are available as Angular components inside a **custom widget**. Reference the
page component by its selector in a widget's HTML template:

```html
<tb-sql-console-page [ctx]="ctx"></tb-sql-console-page>
```

`ctx` is the standard widget context; the component also works without it (it falls
back to its own Angular injector). There is no separate route — like the other
examples in this module, the entry point is the component selector.

## Queryable surface: analytics datasets

Analytics datasets are the **only** queryable relations. The schema browser lists the tenant's
datasets under **Business datasets** (`Tenant-defined`), loaded via
`SqlQueryService.listDatasets()` → `GET /api/sql/datasets`, and offers their bare logical names
(and columns) in autocomplete. Datasets are created out-of-band via `POST /api/sql/datasets`
(see `ANALYTICS_DATASETS.md`); the console has no create-dataset UI.

> The legacy tenant business-view flow (a "Create view" dialog calling `POST /api/sql/views`)
> and the platform-view browsing have been removed — datasets replace both as the queryable
> surface.

## How queries are executed

`SqlQueryService.executeQuery(query)` sends:

```http
POST /api/sql/query
Content-Type: application/json

{ "query": "SELECT ...", "permissions": [ { "resource": "ASSET", "operation": "READ" }, ... ] }
```

- Authentication is taken from the running ThingsBoard session (no credentials are
  hardcoded).
- The `permissions` array is required by the current backend (`SqlQueryController`),
  which verifies each with the same RBAC engine as the REST endpoints. The console
  declares `ASSET` `READ` / `READ_ATTRIBUTES` / `READ_TELEMETRY` — the permissions the
  domain views require. Adjust `SQL_CONSOLE_PERMISSIONS` in `sql-query.service.ts` if
  your queries touch other resources.
- The backend also binds the caller's tenant and applies tenant isolation through the
  security-barrier views, so results are always scoped to the current tenant.

## Supported autocomplete

Token-based (not a full parser). Suggestions:

- SQL keywords (`SELECT`, `FROM`, `WHERE`, `JOIN`, `GROUP BY`, `ORDER BY`, …).
- Aggregates (`COUNT()`, `SUM()`, `AVG()`, `MIN()`, `MAX()`).
- Domain view names, and view fields from the static schema.

Context-aware behavior: view names after `FROM`/`JOIN`; fields after `SELECT`,
`ORDER BY`, `GROUP BY`, `WHERE`, `ON`; and fields of a specific view after
`alias.` / `view.` / `thingsboard_sql.`. Navigate with ↑/↓, accept with `Enter`/`Tab`,
dismiss with `Esc`.

## Client-side validation

Before sending, the console checks (for user feedback only — the backend remains
authoritative): the query starts with `SELECT`/`WITH`; a single statement (no extra
`;`); and no write keywords (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`,
`TRUNCATE`, …). Invalid queries are not sent and an inline message is shown.

## Domain schema

`sql-schema.data.ts` mirrors `openspec/sql-api/thingsboard_domain_views.sql` exactly:

| View | Columns |
|------|---------|
| `assets` | `id`, `name`, `type` |
| `asset_relations` | `from_asset_id`, `to_asset_id`, `type` |
| `server_attributes` | `asset_id`, `key`, `string_value`, `number_value` |
| `telemetry` | `asset_id`, `key`, `ts`, `string_value`, `number_value` |
| `latest_telemetry` | `asset_id`, `key`, `ts`, `string_value`, `number_value` |

Only these domain columns are shown — never physical ThingsBoard tables, key
dictionaries or encoded value columns.

## Current limitations

- Editor is a textarea with a custom lightweight autocomplete (not Monaco); the
  autocomplete is heuristic/token-based, not a full SQL parser.
- Read-only queries only. No charts, saved queries, query history, multi-query tabs,
  or SQL formatting beyond a simple clause-per-line pass.
- The UI renders at most 1,000 rows even if the backend returns more (a truncation
  note is shown); the full result is still available via **Copy result as JSON**.
- The static schema must be kept in sync with the SQL views if the views change.
