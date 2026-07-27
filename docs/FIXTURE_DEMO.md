# Fixture demonstration

This proof uses fictional workforce records. It does not connect to Deputy and contains no
customer or employee data.

## Run the repository build

```bash
pnpm install
pnpm build
pnpm proof:fixture
```

## Verify the public package

After publication, this command starts the public npm package in fixture mode, lists its tools,
calls `find_coverage_gaps`, and prints only proof metadata:

```bash
pnpm proof:published
```

Expected shape:

```json
{
  "package": "@hyperdrift-io/deputy-workforce-mcp@latest",
  "fixture_only": true,
  "tool_count": 5,
  "tools": [
    "find_coverage_gaps",
    "flag_overtime_risk",
    "list_timesheet_exceptions",
    "find_availability_conflicts",
    "summarise_staffing"
  ],
  "called": "find_coverage_gaps",
  "finding_count": 8,
  "is_error": false
}
```

The verified output is recorded in `docs/proof/clean-install.json` only after it has been produced
from the public package.
