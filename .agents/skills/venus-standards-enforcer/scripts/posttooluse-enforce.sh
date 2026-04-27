#!/usr/bin/env bash
set -euo pipefail

# Read hook payload from stdin so future checks can use tool-level context.
payload="$(cat || true)"

# Resolve repository root to make git-diff and eslint execution deterministic.
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

# Skip when there are no unstaged/staged file edits to validate.
if git diff --quiet -- . && git diff --cached --quiet -- .; then
  exit 0
fi

# Collect changed code files only; docs-only edits are validated by normal review flow.
mapfile -t changed_code_files < <(
  {
    git diff --name-only --diff-filter=ACM -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mts' '*.cts'
    git diff --cached --name-only --diff-filter=ACM -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mts' '*.cts'
  } | sort -u
)

# Skip when the current edit set does not touch code files.
if [[ ${#changed_code_files[@]} -eq 0 ]]; then
  exit 0
fi

violations=()
temp_tag_violations=()
structural_comment_violations=()

for file in "${changed_code_files[@]}"; do
  # Aggregate added lines from staged and unstaged hunks for per-file comment checks.
  added_lines="$({
    git diff -U0 -- "$file"
    git diff --cached -U0 -- "$file"
  } | grep -E '^\+[^+]' || true)"

  # Ignore files without added code lines in the current delta.
  added_non_empty_count="$(printf '%s\n' "$added_lines" | grep -vcE '^\+\s*$' || true)"
  if [[ "$added_non_empty_count" -eq 0 ]]; then
    continue
  fi

  # Require at least one explicit intent-style comment among added lines.
  added_comment_count="$(printf '%s\n' "$added_lines" | grep -cE '^\+\s*(//|/\*|\*)' || true)"
  if [[ "$added_comment_count" -eq 0 ]]; then
    violations+=("$file")
  fi

  # Require AI-tagged temporary markers so temporary edits remain searchable.
  temp_marker_count="$(printf '%s\n' "$added_lines" | grep -ciE '^\+.*\b(TODO|FIXME|HACK|temporary|temporary guard|compat shim|compatibility guard)\b' || true)"
  ai_temp_count="$(printf '%s\n' "$added_lines" | grep -cE '^\+.*AI-TEMP:' || true)"
  if [[ "$temp_marker_count" -gt 0 && "$ai_temp_count" -eq 0 ]]; then
    temp_tag_violations+=("$file")
  fi

  # Approximate declaration coverage so new functions and type contracts do not
  # arrive completely uncommented even when a file already contains one comment.
  if ! printf '%s\n' "$added_lines" | awk '
    BEGIN {
      last_comment = 0
      inside_contract = 0
      violation = 0
    }
    {
      line = $0
      sub(/^\+/, "", line)
      trimmed = line
      gsub(/^[[:space:]]+/, "", trimmed)

      if (trimmed == "") {
        next
      }

      if (trimmed ~ /^(\/\/|\/\*|\*)/) {
        last_comment = 1
        next
      }

      if (trimmed ~ /^}/) {
        inside_contract = 0
        last_comment = 0
        next
      }

      if (
        trimmed ~ /^(export[[:space:]]+)?(async[[:space:]]+)?function[[:space:]]+/ ||
        trimmed ~ /^(export[[:space:]]+)?const[[:space:]]+[A-Za-z0-9_$]+[[:space:]]*=[[:space:]]*(async[[:space:]]*)?\(/ ||
        trimmed ~ /^(export[[:space:]]+)?const[[:space:]]+[A-Za-z0-9_$]+[[:space:]]*=[[:space:]]*(async[[:space:]]*)?[A-Za-z0-9_$]+[[:space:]]*=>/ ||
        trimmed ~ /^(export[[:space:]]+)?interface[[:space:]]+/ ||
        trimmed ~ /^(export[[:space:]]+)?type[[:space:]]+[A-Za-z0-9_$]+[[:space:]]*=/
      ) {
        if (last_comment == 0 && trimmed !~ /\/\//) {
          violation = 1
        }
      }

      if (trimmed ~ /^(export[[:space:]]+)?interface[[:space:]]+/ || trimmed ~ /^(export[[:space:]]+)?type[[:space:]]+[A-Za-z0-9_$]+[[:space:]]*=.*{[[:space:]]*$/) {
        inside_contract = 1
      }

      if (
        inside_contract == 1 &&
        trimmed !~ /^(readonly[[:space:]]+)?\/\// &&
        trimmed ~ /^[A-Za-z0-9_$"\047\[][^=]*:[^=].*[;,]$/
      ) {
        if (last_comment == 0 && trimmed !~ /\/\//) {
          violation = 1
        }
      }

      last_comment = 0
    }
    END {
      exit violation
    }
  '; then
    structural_comment_violations+=("$file")
  fi
done

if [[ ${#violations[@]} -gt 0 ]]; then
  # Emit a concise blocking message so the agent must patch files before continuing.
  {
    echo "[venus-standards-enforcer] Missing required intent comments in changed code files:"
    for file in "${violations[@]}"; do
      echo "- $file"
    done
    echo "Add an intent comment in each listed file, then continue."
  } >&2

  printf '%s\n' '{"decision":"block","reason":"Missing intent comments in changed code files."}'
  exit 2
fi

if [[ ${#temp_tag_violations[@]} -gt 0 ]]; then
  {
    echo "[venus-standards-enforcer] Missing AI-TEMP tags for temporary markers in changed code files:"
    for file in "${temp_tag_violations[@]}"; do
      echo "- $file"
    done
    echo "Add an AI-TEMP comment describing why the change is temporary, when to remove it, and the tracking ref."
  } >&2

  printf '%s\n' '{"decision":"block","reason":"Missing AI-TEMP tags for temporary markers."}'
  exit 2
fi

if [[ ${#structural_comment_violations[@]} -gt 0 ]]; then
  {
    echo "[venus-standards-enforcer] Missing required declaration/type comments in changed code files:"
    for file in "${structural_comment_violations[@]}"; do
      echo "- $file"
    done
    echo "Add leading comments for new functions/types and line-level comments for changed contract fields, then continue."
  } >&2

  printf '%s\n' '{"decision":"block","reason":"Missing required declaration/type comments in changed code files."}'
  exit 2
fi

# Run ESLint on changed files to enforce coding-standard and style gates immediately.
if ! pnpm exec eslint --max-warnings=0 "${changed_code_files[@]}" >/tmp/venus-standards-enforcer-eslint.log 2>&1; then
  {
    echo "[venus-standards-enforcer] ESLint failed for changed files:"
    printf '%s\n' "${changed_code_files[@]}"
    echo ""
    echo "--- eslint output (tail) ---"
    tail -n 80 /tmp/venus-standards-enforcer-eslint.log || true
  } >&2

  printf '%s\n' '{"decision":"block","reason":"ESLint failed for changed code files."}'
  exit 2
fi

# Keep stdout valid JSON for hook integrations that parse structured output.
printf '%s\n' '{"decision":"continue"}'
