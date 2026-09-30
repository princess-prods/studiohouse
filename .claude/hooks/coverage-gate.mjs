#!/usr/bin/env node
/**
 * PreToolUse hook (Bash): before `gh pr create`, run test coverage for the
 * projects affected on this branch and report gaps.
 *
 * - Blocks the PR (exit 2) when any affected project is below MIN_LINES.
 * - Otherwise allows it but feeds the per-file gaps back as context, so the
 *   remaining shortfall to 100% is addressed or justified in the PR body.
 *
 * Reads the hook payload from stdin; only acts on Bash commands that create a PR.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const MIN_LINES = Number(process.env.COVERAGE_MIN_LINES ?? 80);
const root = process.cwd();

const payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
const command = payload?.tool_input?.command ?? '';
// Match a real invocation (start of command or after a separator), not a mention in text.
if (
  payload?.tool_name !== 'Bash' ||
  !/(^|[;&|]\s*)gh\s+pr\s+create\b/m.test(command)
) {
  process.exit(0);
}

function sh(cmd) {
  return execSync(cmd, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
}

let affected = [];
try {
  sh('git fetch -q origin main');
  affected = JSON.parse(
    sh(
      'npx nx show projects --affected --base=origin/main --with-target=test --json',
    ),
  );
} catch (error) {
  console.error(
    `coverage-gate: could not compute affected projects: ${error.message}`,
  );
  process.exit(0); // never block on tooling failure
}
if (affected.length === 0) {
  console.log('coverage-gate: no affected projects with tests; skipping.');
  process.exit(0);
}

try {
  sh(
    `npx nx run-many -t test --coverage --projects=${affected.join(',')} --output-style=static`,
  );
} catch (error) {
  console.error(
    `coverage-gate: tests failed on branch:\n${error.stdout ?? error.message}`,
  );
  process.exit(2);
}

function findSummaries(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) findSummaries(p, out);
    else if (name === 'coverage-summary.json') out.push(p);
  }
  return out;
}

const rows = [];
const gaps = [];
let block = false;
for (const file of findSummaries(join(root, 'coverage'))) {
  const summary = JSON.parse(readFileSync(file, 'utf8'));
  const project = relative(join(root, 'coverage'), file)
    .replace(/[\\/]coverage-summary\.json$/, '')
    .replace(/\\/g, '/');
  const t = summary.total;
  const lines = t.lines.total === 0 ? 100 : t.lines.pct;
  rows.push(
    `${project}: lines ${lines}%  branches ${t.branches.pct}%  functions ${t.functions.pct}%`,
  );
  if (lines < MIN_LINES) block = true;
  for (const [path, s] of Object.entries(summary)) {
    if (path === 'total' || s.lines.pct === 100) continue;
    gaps.push(
      `  ${relative(root, path).replace(/\\/g, '/')}  lines ${s.lines.pct}%  branches ${s.branches.pct}%`,
    );
  }
}

const report = [
  `coverage-gate (target 100%, minimum ${MIN_LINES}% lines):`,
  ...rows.map((r) => `  ${r}`),
];
if (gaps.length) report.push('files below 100% lines:', ...gaps);

if (block) {
  console.error(
    [
      ...report,
      '',
      `Blocked: a project is below ${MIN_LINES}% line coverage. Add tests (see /coverage), then retry.`,
    ].join('\n'),
  );
  process.exit(2);
}

const context = gaps.length
  ? [
      ...report,
      '',
      'Close these gaps before opening the PR, or state in the PR body why they are left.',
    ].join('\n')
  : report
      .concat('All affected projects are at 100% line coverage.')
      .join('\n');

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: rows.join('; '),
      additionalContext: context,
    },
  }),
);
