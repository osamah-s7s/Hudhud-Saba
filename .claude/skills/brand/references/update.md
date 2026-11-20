Update brand colors, typography, and style - automatically syncs to all design system files.

<args>$ARGUMENTS</args>

## Contents

- [Overview](#overview)
- [Workflow](#workflow)
  - [Step 1: Gather Brand Input](#step-1-gather-brand-input)
  - [Step 2: Update Brand Guidelines](#step-2-update-brand-guidelines)
  - [Step 3: Sync to Design Tokens](#step-3-sync-to-design-tokens)
  - [Step 4: Verify Sync](#step-4-verify-sync)
  - [Step 5: Report](#step-5-report)
- [Files Modified](#files-modified)
- [Skills Used](#skills-used)
- [Examples](#examples)
- [Color Presets](#color-presets)
- [Important](#important)

## Overview

This command systematically updates:
1. `docs/80-decisions/83-adr-003-brand-refresh.md` - Brand direction
2. `packages/shared/design/tokens.json` - Token source of truth
3. `packages/shared/design/tokens.css` - Generated CSS variables

## Workflow

### Step 1: Gather Brand Input

Use `AskUserQuestion` to collect:

**Theme Selection:**
- Theme name (e.g., "Ocean Professional", "Electric Creative", "Forest Calm")

**Primary Color:**
- Color name (e.g., "Ocean Blue", "Coral", "Forest Green")
- Hex code (e.g., #3B82F6)

**Secondary Color:**
- Color name (e.g., "Golden Amber", "Electric Purple")
- Hex code

**Accent Color:**
- Color name (e.g., "Emerald", "Neon Mint")
- Hex code

**Brand Mood (for AI image generation):**
- Mood keywords (e.g., "professional, trustworthy, premium" or "bold, creative, energetic")

### Step 2: Update Brand Guidelines

Edit the approved brand source document:

1. **Quick Reference table** - Update color names and hex codes
2. **Brand Concept section** - Update theme name and description
3. **Color Palette section** - Update Primary, Secondary, Accent colors with shades
4. **AI Image Generation section** - Update base prompt, keywords, mood descriptors

### Step 3: Sync to Design Tokens

Run the sync script:
```bash
node scripts/sync-brand-to-tokens.cjs
```

If the script reports an existing token source, inspect the named file before
continuing. Detection covers `:root` custom properties, Tailwind v4 `@theme`
variables in common CSS entry points and their local imports, and Tailwind
theme colors or presets. Do not create a parallel token system beside those
sources. Use `--force` only when the detected source is the managed
the managed token output from an earlier sync and replacing it is
intentional:
```bash
node scripts/sync-brand-to-tokens.cjs --force
```

This will:
- Update `packages/shared/design/tokens.json` with new color names and values
- Regenerate `packages/shared/design/tokens.css` with the repository token command

### Step 4: Verify Sync

Confirm all files are updated:
```bash
# Check brand context extraction
node scripts/inject-brand-context.cjs --json | head -30

# Check CSS variables
rg "primary" packages/shared/design/tokens.css
```

### Step 5: Report

Output summary:
- Theme: [name]
- Primary: [name] ([hex])
- Secondary: [name] ([hex])
- Accent: [name] ([hex])
- Files updated: the approved brand source, `packages/shared/design/tokens.json`, and generated token output

## Files Modified

| File | Purpose |
|------|---------|
| `docs/80-decisions/83-adr-003-brand-refresh.md` | Brand direction |
| `packages/shared/design/tokens.json` | Token definitions (primitive→semantic→component) |
| `packages/shared/design/tokens.css` | Generated CSS variables for UI components |

## Skills Used

- `brand` - Brand context extraction and sync
- `design-system` - Token generation

## Examples

```bash
# Interactive mode
/brand:update

# With theme hint
/brand:update "Ocean Professional"

# Quick preset
/brand:update "midnight purple"
```

## Color Presets

If user specifies a preset name, use these defaults:

| Preset | Primary | Secondary | Accent |
|--------|---------|-----------|--------|
| ocean-professional | #3B82F6 Ocean Blue | #F59E0B Golden Amber | #10B981 Emerald |
| electric-creative | #FF6B6B Coral | #9B5DE5 Electric Purple | #00F5D4 Neon Mint |
| forest-calm | #059669 Forest Green | #92400E Warm Brown | #FBBF24 Sunlight |
| midnight-purple | #7C3AED Violet | #EC4899 Pink | #06B6D4 Cyan |
| sunset-warm | #F97316 Orange | #DC2626 Red | #FACC15 Yellow |

## Important

- **Always sync all three files** - Never update just brand-guidelines.md alone
- **Verify extraction** - Run inject-brand-context.cjs after update to confirm
- **Test image generation** - Optionally generate a test image to verify brand application
