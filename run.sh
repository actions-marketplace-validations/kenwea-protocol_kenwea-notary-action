#!/usr/bin/env bash
# Kenwea Notary — composite-action entrypoint.
#
# Runs the published @kenwea/mcp CLI in --json mode, sets step outputs and a job
# summary from the result, and propagates the CLI's exit code so `fail-on` actually
# gates the build. No logic about verdicts lives here -- the CLI decides, this shell
# only wires it to GitHub.
set -uo pipefail

pkg="${KENWEA_PACKAGE:-}"
if [ -z "$pkg" ]; then
  echo "::error::kenwea-notary: 'package' input is required" >&2
  exit 2
fi
ver="${KENWEA_MCP_VERSION:-latest}"

args=(check "$pkg" --json)
if [ -n "${KENWEA_FAIL_ON:-}" ]; then
  args+=(--fail-on "$KENWEA_FAIL_ON")
fi

# --json puts the result object on stdout and every progress line on stderr, so we
# capture stdout to parse while the log still shows what happened. Capturing the exit
# code separately is why this script does not use `set -e`: a non-zero exit from a
# tripped gate is an expected outcome we still need to report before re-raising.
result="$(npx -y "@kenwea/mcp@${ver}" "${args[@]}")"
code=$?

# Emit outputs and the summary whether or not the gate failed, so a later step can
# read the verdict even on a blocked build.
printf '%s' "$result" | node "${GITHUB_ACTION_PATH}/emit.js"

exit "$code"
