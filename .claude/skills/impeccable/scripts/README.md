# Impeccable scripts

The launcher is the supported entrypoint for the bundled commands.

| Command family | Purpose | Verification |
|---|---|---|
| `context` | Loads project and surface context | Confirm the command exits successfully before proceeding |
| `critique`, `audit`, `detect` | Produces bounded UI evidence | Read the generated result and preserve its provenance |
| `critique-storage` | Stores and retrieves critique snapshots | Verify the returned slug or stored file |

On Windows use `impeccable.cmd` when the shell cannot execute the Unix launcher. Keep the working directory at the project root and report launcher failures explicitly.
