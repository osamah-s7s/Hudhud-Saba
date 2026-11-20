# UI/UX Pro Max scripts

The scripts use only the bundled data unless a command explicitly says otherwise.

| Script | Purpose | Verification |
|---|---|---|
| `search.py` | Searches style, product, UX, chart, and stack data | Verify the returned domain and result fit |
| `validate_data.py` | Validates data contracts and freshness | Treat non-zero exit codes as failures |
| `core.py` and `design_system.py` | Shared search and design-system logic | Exercise through the public search command |

Use Python 3.x. Queries should not contain private project data. If a search returns no verified match, retry once with a narrower query and label any fallback guidance.
