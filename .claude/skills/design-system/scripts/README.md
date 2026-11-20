# Design-system scripts

Run these scripts from the repository root. Generated files are outputs; change the source token file first.

| Script | Purpose | Verification |
|---|---|---|
| `generate-tokens.cjs` | Generates platform token outputs | Run `npm run tokens` and inspect generated files |
| `validate-tokens.cjs` | Finds hard-coded values and token violations | Treat a non-zero exit code as failure |
| `search-slides.py` | Searches the bundled slide data | Check the returned domain and result relevance |
| `slide-token-validator.py` | Validates slide token usage | Run after generating slide HTML |
| `html-token-validator.py` | Checks HTML token compliance | Review every reported violation |

Python scripts require Python 3.x. If a command fails, report the command and error instead of claiming the design passed validation.
