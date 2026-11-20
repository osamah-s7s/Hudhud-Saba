# Brand scripts

These scripts run from the project root and use paths supplied by the current project configuration.

| Script | Purpose | Verification |
|---|---|---|
| `inject-brand-context.cjs` | Reads approved brand context for prompts | Run with `--json` and inspect the output |
| `sync-brand-to-tokens.cjs` | Synchronizes approved brand values into token outputs | Run the repository token check after syncing |
| `validate-asset.cjs` | Checks asset naming, dimensions, and format | Exit code `0` means the asset passed |
| `extract-colors.cjs` | Extracts or compares colors | Inspect the reported palette before applying it |

Use `node scripts/<script>` from the repository root. Missing source files, detected token sources, and invalid assets must be reported; do not treat an empty or partial result as success.
