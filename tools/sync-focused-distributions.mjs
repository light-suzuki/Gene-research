#!/usr/bin/env node
// Sync the focused distributions (LocalBlastWorkbench / PrimerWorkbench /
// MarkerWorkbench) from this repo, using the same rules that
// check-focused-distributions.mjs verifies.
//
// For every non-standalone repo in tools/focused-distributions.json it:
//   - copies every parent-tracked file byte-for-byte, except removedFiles and
//     intentionalDiffs (those stay repo-specific),
//   - deletes removedFiles and any file that is neither in the parent nor in
//     addedFiles / intentionalDiffs (stale leftovers).
// It does not commit or push: review the working tree, run the focused repo's
// tests, open a PR, then run the checker with --record on the parent.
//
// Usage:
//   node tools/sync-focused-distributions.mjs --work-dir <dir> [--repo <name>] [--parent-dir <path>]
// <dir>/<repo> is cloned (or fetched and reset to origin/<branch>) first.
//
// Exit codes: 0 = done, 2 = usage error.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function git(args, cwd) {
  const res = spawnSync("git", ["-c", "core.autocrlf=false", ...args], { cwd, encoding: "utf8", timeout: 300_000 });
  if (res.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${(res.stderr || "").trim()}`);
  return (res.stdout || "").trim();
}

function main() {
  const args = process.argv.slice(2);
  let parentDir = path.resolve(__dirname, "..");
  let workDir = null;
  let only = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--parent-dir") parentDir = path.resolve(args[++i]);
    else if (args[i] === "--work-dir") workDir = path.resolve(args[++i]);
    else if (args[i] === "--repo") only = args[++i];
    else {
      console.error("usage: node tools/sync-focused-distributions.mjs --work-dir <dir> [--repo <name>] [--parent-dir <path>]");
      return 2;
    }
  }
  if (!workDir) {
    console.error("--work-dir is required");
    return 2;
  }
  const manifest = JSON.parse(readFileSync(path.join(__dirname, "focused-distributions.json"), "utf8"));
  const parentFiles = git(["ls-files"], parentDir).split("\n").filter(Boolean);
  mkdirSync(workDir, { recursive: true });

  for (const entry of manifest.repos) {
    const name = entry.repo.split("/").pop();
    if (only && only !== name && only !== entry.repo) continue;
    if (entry.mode === "standalone") {
      console.log(`[${entry.repo}] standalone: skipped (only sharedFiles are checked)`);
      continue;
    }
    const repoDir = path.join(workDir, name);
    if (existsSync(repoDir)) {
      git(["fetch", "--quiet", "origin", entry.branch], repoDir);
      git(["checkout", "--quiet", "-B", `sync-from-parent`, `origin/${entry.branch}`], repoDir);
    } else {
      git(["clone", "--quiet", "--branch", entry.branch, `https://github.com/${entry.repo}.git`, repoDir], workDir);
      git(["checkout", "--quiet", "-B", "sync-from-parent"], repoDir);
    }
    const removed = new Set(entry.removedFiles ?? []);
    const added = new Set(entry.addedFiles ?? []);
    const intentional = new Set(Object.keys(entry.intentionalDiffs ?? {}));
    const parentSet = new Set(parentFiles);
    let copied = 0;
    let deleted = 0;
    for (const file of parentFiles) {
      if (removed.has(file)) {
        if (existsSync(path.join(repoDir, file))) {
          rmSync(path.join(repoDir, file));
          deleted += 1;
        }
        continue;
      }
      if (intentional.has(file)) continue;
      mkdirSync(path.dirname(path.join(repoDir, file)), { recursive: true });
      copyFileSync(path.join(parentDir, file), path.join(repoDir, file));
      copied += 1;
    }
    for (const file of git(["ls-files"], repoDir).split("\n").filter(Boolean)) {
      if (parentSet.has(file) || added.has(file) || intentional.has(file)) continue;
      rmSync(path.join(repoDir, file));
      deleted += 1;
    }
    console.log(`[${entry.repo}] synced into ${repoDir} (copied ${copied}, deleted ${deleted}). Review 'git status', test, open a PR.`);
  }
  return 0;
}

process.exitCode = main();
