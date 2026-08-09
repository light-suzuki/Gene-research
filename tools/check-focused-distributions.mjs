#!/usr/bin/env node
// focused distribution source-drift checker for Gene-research.
//
// Each focused repo (LocalBlastWorkbench / PrimerWorkbench / MarkerWorkbench /
// SequenceInspector) is a source-level distribution of this repo. This script
// verifies mechanically that:
//   - every "common" file (present in both, not removed, not allowlisted)
//     is byte-identical to the parent repo
//   - removedFiles (extraction rule) are actually absent
//   - addedFiles (e.g. focusedTabs.ts) actually exist
//   - no unexpected extra file appeared in the focused repo
//   - intentional differences listed in intentionalDiffs are tolerated
//
// Usage:
//   node tools/check-focused-distributions.mjs            # check (clones to temp)
//   node tools/check-focused-distributions.mjs --record   # check + record synced revisions
//   node tools/check-focused-distributions.mjs --self-test
//   node tools/check-focused-distributions.mjs --parent-dir <path>  # parent checkout
//   node tools/check-focused-distributions.mjs --work-dir <path>    # clone cache dir
//
// Exit codes: 0 = in sync, 1 = drift found or self-test failed, 2 = usage error.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.join(__dirname, "focused-distributions.json");

function usage() {
  console.error(
    "usage: node tools/check-focused-distributions.mjs [--record] [--self-test] [--parent-dir <path>] [--work-dir <path>]",
  );
}

function runGit(args, cwd) {
  const res = spawnSync("git", args, { cwd, encoding: "utf8", timeout: 180_000 });
  if (res.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed (rc=${res.status}): ${(res.stderr || "").trim()}`);
  }
  return (res.stdout || "").trim();
}

function hashFile(filePath) {
  const data = readFileSync(filePath);
  return createHash("sha256").update(data).digest("hex");
}

// Tracked file list: git ls-files when the dir is a git checkout, otherwise a
// recursive walk (used for fixtures / localPath mode). Paths are always
// normalized to forward slashes to match the manifest.
function listFiles(dir) {
  const gitDir = path.join(dir, ".git");
  if (existsSync(gitDir)) {
    const files = runGit(["ls-files"], dir).split("\n").filter(Boolean);
    return files;
  }
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(dir, full).split(path.sep).join("/"));
    }
  };
  walk(dir);
  return out;
}

// ---------------------------------------------------------------------------
// check a single focused repo against the parent checkout
// ---------------------------------------------------------------------------
function checkRepo(entry, parentDir, workDir) {
  const repoDir = entry.localPath
    ? path.resolve(entry.localPath)
    : path.join(workDir, entry.repo.replace(/[^A-Za-z0-9_-]/g, "_"));
  if (entry.localPath) {
    if (!existsSync(repoDir)) throw new Error(`localPath not found: ${repoDir}`);
  } else {
    mkdirSync(workDir, { recursive: true });
    const url = `https://github.com/${entry.repo}.git`;
    if (existsSync(repoDir)) {
      runGit(["fetch", "--quiet", "--depth", "1", "origin", entry.branch], repoDir);
      runGit(["reset", "--quiet", "--hard", "FETCH_HEAD"], repoDir);
    } else {
      runGit(["clone", "--quiet", "--depth", "1", "--branch", entry.branch, url, repoDir], workDir);
    }
  }
  const head = existsSync(path.join(repoDir, ".git")) ? runGit(["rev-parse", "HEAD"], repoDir) : null;
  const focusedFiles = listFiles(repoDir);
  const parentFiles = listFiles(parentDir);

  const removed = new Set(entry.removedFiles ?? []);
  const added = new Set(entry.addedFiles ?? []);
  const intentional = new Set(Object.keys(entry.intentionalDiffs ?? {}));

  const drift = [];
  const intentionalHits = [];

  for (const file of parentFiles) {
    if (removed.has(file)) {
      if (focusedFiles.includes(file)) drift.push(`should be removed: ${file}`);
      continue;
    }
    if (!focusedFiles.includes(file)) {
      drift.push(`missing: ${file}`);
      continue;
    }
    if (intentional.has(file)) {
      const parentHash = hashFile(path.join(parentDir, file));
      const focusedHash = hashFile(path.join(repoDir, file));
      if (parentHash !== focusedHash) intentionalHits.push(file);
      continue;
    }
    const parentHash = hashFile(path.join(parentDir, file));
    const focusedHash = hashFile(path.join(repoDir, file));
    if (parentHash !== focusedHash) drift.push(`modified: ${file}`);
  }

  for (const file of removed) {
    if (focusedFiles.includes(file)) drift.push(`unexpected (removed rule violated): ${file}`);
  }
  for (const file of added) {
    if (!focusedFiles.includes(file)) drift.push(`missing added file: ${file}`);
  }
  for (const file of focusedFiles) {
    if (!parentFiles.includes(file) && !added.has(file) && !intentional.has(file)) {
      drift.push(`unexpected file: ${file}`);
    }
  }

  const revision = entry.revision ?? null;
  const revisionNote = revision && head && revision !== head ? " (manifest の記録と異なる)" : "";
  return { entry, head, revisionNote, drift, intentionalHits };
}

// ---------------------------------------------------------------------------
// run all checks
// ---------------------------------------------------------------------------
function runChecks(manifest, parentDir, workDir) {
  const results = [];
  for (const entry of manifest.repos) {
    try {
      results.push(checkRepo(entry, parentDir, workDir));
    } catch (err) {
      results.push({ entry, head: null, drift: [], error: err.message });
    }
  }
  return results;
}

function printResults(results, parentHead) {
  let driftTotal = 0;
  for (const r of results) {
    const label = `[${r.entry.repo}]`;
    if (r.error) {
      console.log(`${label} ERROR: ${r.error}`);
      driftTotal += 1;
      continue;
    }
    console.log(`${label}`);
    console.log(`  branch:      ${r.entry.branch}`);
    console.log(`  head:        ${r.head}${r.revisionNote || ""}`);
    console.log(`  parent rev:  ${r.entry.parentRevision ?? "(未記録)"}`);
    if (r.drift.length) {
      console.log(`  DRIFT (${r.drift.length}):`);
      for (const d of r.drift) console.log(`    - ${d}`);
    } else {
      console.log("  drift: none");
    }
    if (r.intentionalHits.length) {
      console.log(`  intentional diffs (allowlist 反映、${r.intentionalHits.length} 件):`);
      for (const f of r.intentionalHits) console.log(`    - ${f}`);
    }
    driftTotal += r.drift.length;
  }
  console.log(`parent HEAD:  ${parentHead}`);
  return driftTotal;
}

// ---------------------------------------------------------------------------
// self-test: fixture-based drift detection
// ---------------------------------------------------------------------------
function runSelfTest() {
  const base = path.join(tmpdir(), "focused-distribution-self-test");
  rmSync(base, { recursive: true, force: true });
  const parentDir = path.join(base, "parent");
  const focusedDir = path.join(base, "focused");

  const common = "backend/common.py";
  const allowlisted = "frontend/App.tsx";
  const removed = "backend/legacy.py";
  const added = "frontend/focusedTabs.ts";

  mkdirSync(path.dirname(path.join(parentDir, common)), { recursive: true });
  mkdirSync(path.dirname(path.join(parentDir, allowlisted)), { recursive: true });
  mkdirSync(path.dirname(path.join(parentDir, removed)), { recursive: true });
  writeFileSync(path.join(parentDir, common), "VALUE=1\n");
  writeFileSync(path.join(parentDir, allowlisted), "parent version\n");
  writeFileSync(path.join(parentDir, removed), "legacy\n");

  mkdirSync(path.dirname(path.join(focusedDir, common)), { recursive: true });
  mkdirSync(path.dirname(path.join(focusedDir, allowlisted)), { recursive: true });
  mkdirSync(path.dirname(path.join(focusedDir, added)), { recursive: true });
  writeFileSync(path.join(focusedDir, common), "VALUE=2\n"); // drift
  writeFileSync(path.join(focusedDir, allowlisted), "focused version\n"); // intentional
  writeFileSync(path.join(focusedDir, added), "export const focusedTabs = [];\n");

  const manifest = {
    parent: { repo: "fixture/parent", branch: "main" },
    repos: [
      {
        repo: "fixture/focused",
        branch: "main",
        localPath: focusedDir,
        removedFiles: [removed],
        addedFiles: [added],
        intentionalDiffs: { [allowlisted]: "focused tabs" },
      },
    ],
  };

  const [result] = runChecks(manifest, parentDir, base);
  const ok =
    result.drift.some((d) => d.includes(common)) &&
    !result.drift.some((d) => d.includes(allowlisted)) &&
    !result.drift.some((d) => d.includes(removed)) &&
    !result.drift.some((d) => d.includes(added)) &&
    result.intentionalHits.includes(allowlisted);

  printResults([result], "fixture");
  rmSync(base, { recursive: true, force: true });
  if (!ok) {
    console.error("SELF-TEST FAILED");
    return 1;
  }
  console.log("SELF-TEST PASSED (drift detected, intentional diff tolerated)");
  return 0;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  const flags = { record: false, selfTest: false };
  let parentDirArg = null;
  let workDirArg = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--record") flags.record = true;
    else if (args[i] === "--self-test") flags.selfTest = true;
    else if (args[i] === "--parent-dir") parentDirArg = args[++i];
    else if (args[i] === "--work-dir") workDirArg = args[++i];
    else if (args[i] === "--help" || args[i] === "-h") {
      usage();
      return 0;
    } else {
      console.error(`unknown option: ${args[i]}`);
      usage();
      return 2;
    }
  }

  if (flags.selfTest) return runSelfTest();

  const manifestPath = process.env.FOCUSED_MANIFEST || MANIFEST_PATH;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const parentDir = parentDirArg ? path.resolve(parentDirArg) : path.resolve(__dirname, "..");
  const workDir = workDirArg ? path.resolve(workDirArg) : path.join(tmpdir(), "focused-distributions-check");

  if (!existsSync(parentDir)) {
    console.error(`parent dir not found: ${parentDir}`);
    return 2;
  }

  const parentHead = runGit(["rev-parse", "HEAD"], parentDir);  const results = runChecks(manifest, parentDir, workDir);
  const driftTotal = printResults(results, parentHead);

  if (flags.record) {
    if (driftTotal > 0) {
      console.error("DRIFT detected: revision を記録する前に同期してください（--record は実施しません）");
      return 1;
    }
    for (const r of results) {
      if (r.error || r.entry.localPath) continue;
      r.entry.parentRevision = parentHead;
      r.entry.revision = r.head;
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log("manifest updated (parentRevision / revision)");
  }

  return driftTotal > 0 ? 1 : 0;
}

process.exitCode = main();
