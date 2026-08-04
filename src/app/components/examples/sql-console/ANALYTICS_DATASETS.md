# User-defined analytics datasets

An **analytics dataset** is a flat, one-row-per-entity table that a tenant admin defines
from a small JSON schema. The server materializes it **directly from the ThingsBoard physical
tables** (`public.asset`, `attribute_kv`, `key_dictionary`, `ts_kv_latest`), keeps it fresh with a
background job, and exposes it through the read-only SQL endpoint. It is the **only** kind of
relation the SQL query endpoint accepts — there is no platform-view layer.

## Endpoints

| Method | Path | Who | Purpose |
| ------ | ---- | --- | ------- |
| `POST` | `/api/sql/datasets` | `TENANT_ADMIN` | Create a dataset from a JSON schema and materialize it |
| `GET`  | `/api/sql/datasets` | `TENANT_ADMIN` | List datasets with columns and sync status |
| `POST` | `/api/sql/query`    | `TENANT_ADMIN`, `CUSTOMER_USER` | Run a read-only query against datasets |

## Schema format

There are two dataset kinds, chosen by `entityType`.

### `ASSET` dataset — flat, one row per asset

```jsonc
{
  "name": "rooms",            // logical name: lowercase, letter-first, [a-z0-9_], <= 28 chars
  "entityType": "ASSET",
  "entitySubtype": "Room",    // asset "type" filter; optional (omit = all asset types)
  "fields": [
    { "name": "room_id",     "source": "entity.id" },                 // required: exactly one entity.id
    { "name": "room_name",   "source": "entity.name" },
    { "name": "capacity",    "source": "attribute.capacity",  "type": "bigint" },
    { "name": "temperature", "source": "latestTelemetry.temperature", "type": "double" }
  ]
}
```

### `RELATION` dataset — a bridge of `(from_id, to_id)` edges

A relation dataset materializes the tenant's entity relations so that sibling asset
datasets can be **joined** (see [Joining datasets](#joining-datasets)). It has no `entitySubtype`,
`attribute.*`, or `latestTelemetry.*` fields — only relation sources — and its column types are
fixed (`from`/`to` are `uuid`, `type` is `varchar`), so `type` is ignored.

```jsonc
{
  "name": "relations",        // logical name, same rules as above
  "entityType": "RELATION",
  "relationType": "Contains", // relation_type filter; optional (omit = all COMMON relations)
  "fields": [
    { "name": "building_id", "source": "relation.from" },  // required: exactly one relation.from
    { "name": "room_id",     "source": "relation.to" },    // required: exactly one relation.to
    { "name": "rel_type",    "source": "relation.type" }   // optional
  ]
}
```

Only asset↔asset relations of group `COMMON` are materialized, and both endpoints are tenant-scoped.

### Field `source`

For `ASSET` datasets:

| Source                       | Comes from             | Notes |
| ---------------------------- | ---------------------- | ----- |
| `entity.id`                  | `asset.id` (uuid)      | **Required, exactly once.** The access-filter key. |
| `entity.name`                | `asset.name` (text)    | |
| `entity.type`                | `asset.type` (text)    | |
| `attribute.<key>`            | `attribute_kv` (server scope) | server-scope attribute value for `<key>` |
| `latestTelemetry.<key>`      | `ts_kv_latest`         | latest value for telemetry key `<key>` |

For `RELATION` datasets:

| Source            | Comes from                 | Notes |
| ----------------- | -------------------------- | ----- |
| `relation.from`   | `relation.from_id` (uuid)  | **Required, exactly once.** Access-filter key (from endpoint). |
| `relation.to`     | `relation.to_id` (uuid)    | **Required, exactly once.** Access-filter key (to endpoint). |
| `relation.type`   | `relation.relation_type`   | the relation type string |

### Field `type`

`type` selects the physical value column for `attribute.*` and `latestTelemetry.*` sources
(ignored for `entity.*`, whose types are fixed: `id`→`uuid`, `name`/`type`→`varchar`). It
**defaults to `double`**, and the analytics column takes the corresponding PostgreSQL type:

| `type`    | reads value column | analytics column type |
| --------- | ------------------ | --------------------- |
| `uuid`    | `str_v` (cast)     | `uuid`                |
| `varchar` | `str_v`            | `varchar`             |
| `bigint`  | `long_v`           | `bigint`              |
| `double`  | `dbl_v`            | `double precision`    |
| `boolean` | `bool_v`           | `boolean`             |
| `json`    | `json_v`           | `json`                |

Pick the type that matches how the value is stored: ThingsBoard writes **integers to `long_v`**
(use `bigint`) and **decimals to `dbl_v`** (use `double`). A mismatch materializes as `NULL`
(e.g. an integer attribute declared `double`). Textual attributes must be `varchar`.

## Querying

Datasets are referenced by their **bare logical name** (no schema prefix):

```sql
SELECT room_name, temperature
FROM rooms
WHERE temperature > 24;
```

## Joining datasets

To relate two `ASSET` datasets, define a `RELATION` bridge dataset over the relation that connects
their entities, then join the parent's id → the bridge's `from` and the child's id → the bridge's
`to`. For example, with `buildings` and `rooms` (`ASSET`) and `relations` (a `Contains` `RELATION`
bridge), count rooms and average temperature per building:

```sql
SELECT b.building_name,
       count(r.room_id)   AS rooms,
       avg(r.temperature) AS avg_temp
FROM buildings b
JOIN relations rel ON rel.from_id = b.building_id   -- building "Contains" …
JOIN rooms r       ON r.room_id   = rel.to_id       -- … room
GROUP BY b.building_name
ORDER BY b.building_name;
```

Access filtering applies to all three datasets: each resolves to the caller's filtered temp copy,
and a bridge edge is present only when **both** of its endpoints are accessible — so a join can
never surface an edge to an entity the user cannot access.

## Access control (per-user entity filtering)

Access control is **only** per-user entity filtering — there is no full-generic-access gate and
no RBAC permission list on the query path. Before a query runs, the server:

1. resolves the asset ids the authenticated user may fully read — those on which they hold
   `READ` **and** `READ_ATTRIBUTES` **and** `READ_TELEMETRY` (a dataset row exposes the asset's
   attributes and latest telemetry), honoring RBAC and group permissions;
2. builds a transaction-scoped filtered temp copy of each referenced dataset
   (`CREATE TEMP TABLE <name> ON COMMIT DROP AS SELECT * FROM <main> WHERE <keys> = ANY(accessible)`)
   and grants the reader role SELECT on it — for an `ASSET` dataset the key is its `entity.id`
   column; for a `RELATION` bridge, an edge is kept only when **both** its `from` and `to` ids are
   accessible;
3. runs the query under the SELECT-only reader role with `pg_temp` first on the search path, so
   each name resolves to its filtered copy;
4. commits — the temp copies are dropped automatically.

The main dataset tables are **never** read by the user query: the reader role has no SELECT on
them, and only the filtered temp copies are reachable. A user with no accessible assets gets no
rows.

## Synchronization

A scheduled job re-materializes every dataset by `DELETE` + `INSERT … SELECT` from the physical
tables, in one transaction per dataset. It is idempotent (re-running with unchanged data yields
the same rows), removes entities that no longer match, and records the last-sync time / last
error in each table's comment (surfaced by `GET /api/sql/datasets`). A failure in one dataset
does not block the others.

Interval: `sql.analytics.sync.interval-ms` (env `SQL_ANALYTICS_SYNC_INTERVAL_MS`), default 60000 ms.

## Storage & roles

- The dataset definition and sync status live in the physical table's PostgreSQL `COMMENT` — no
  separate metadata table or migration.
- Two DB roles (see `openspec/sql-api/thingsboard_sql_setup.sql`): all materialization DDL/DML and
  the query-time temp-copy building run under `tb_sql_analytics_writer`, which owns the dataset
  tables and holds SELECT on the four physical tables. The query role `tb_sql_reader` is
  SELECT-only, has **no** physical-table access, and is never granted SELECT on the main dataset
  tables — it reads only the per-user filtered temp copies (which the writer grants per query).
  The writer needs `TEMPORARY` on the database (granted by default via `PUBLIC`). There is no
  platform-view layer and no `tb_sql_view_owner` / `tb_sql_tenant_view_creator` role.

## Limitations (MVP / idea test)

- **`ASSET` datasets + `RELATION` bridge datasets only.** Both relation endpoints must be assets;
  other entity types are not supported.
- **Flat, one row per entity.** No relation traversal *inside* an asset dataset (no `building_name`
  pulled into a `rooms` row through `asset_relations`); express hierarchy by defining a `RELATION`
  bridge dataset and joining sibling datasets on their id columns (see [Joining datasets](#joining-datasets)).
- **Current values only.** No historical/windowed aggregation (e.g. `SUM(energyKwh)` over a
  time window) — that stays in live SQL.
- **Polling refresh.** Data is as fresh as the last sync tick; check the sync status.
- **Full refresh, hard delete.** Rows for removed entities are deleted, not soft-marked.
- **No multi-node coordination.** On a cluster the refresh may run on more than one core node;
  it is idempotent so this is harmless but redundant.
- **Bare names only.** Reference datasets by their logical name, not a schema-qualified name.
