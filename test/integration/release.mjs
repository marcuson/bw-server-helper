// Only temporary local repositories are used. No production release hook runs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Writable } from 'node:stream';
import semanticRelease from 'semantic-release';
import * as npmPlugin from '@semantic-release/npm';

const root = resolve(import.meta.dirname, '../..');
const directory = mkdtempSync(join(tmpdir(), 'bwsh-release-'));
let log = '';
const output = new Writable({
  write(chunk, _encoding, callback) {
    log += chunk.toString();
    callback();
  },
});
const env = { PATH: process.env.PATH, HOME: process.env.HOME, LANG: 'C.UTF-8' };
try {
  for (const branch of ['main', 'alpha', 'beta']) {
    process.env.GITHUB_REF = `refs/heads/${branch}`;
    // Include the GitHub plugin for import validation, never for execution.
    process.env.GITHUB_TOKEN = 'test-not-a-token';
    const { default: config } = await import(
      `${pathToFileURL(join(root, 'release.config.mjs'))}?branch=${branch}`
    );
    delete process.env.GITHUB_TOKEN;
    for (const plugin of config.plugins) {
      await import(Array.isArray(plugin) ? plugin[0] : plugin);
    }
    const execOptions = config.plugins.find(
      (p) => Array.isArray(p) && p[0] === '@semantic-release/exec',
    )[1];
    assert.ok(
      execOptions.prepareCmd.endsWith(
        branch === 'main' ? 'latest' : `latest-${branch}`,
      ),
    );
    assert.equal(
      config.plugins.some(
        (p) => Array.isArray(p) && p[0] === '@semantic-release/changelog',
      ),
      branch === 'main',
    );

    log = '';
    const cwd = join(directory, branch);
    const remote = join(directory, `${branch}.git`);
    mkdirSync(cwd);
    const git = (...args) =>
      execFileSync('git', args, { cwd, env, stdio: 'pipe' });
    git('init', '--bare', '-b', 'main', remote);
    git('init', '-b', 'main');
    git('config', 'user.name', 'Release Test');
    git('config', 'user.email', 'release@example.test');
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    pkg.version = '1.0.0';
    pkg.scripts = {};
    writeFileSync(join(cwd, 'package.json'), JSON.stringify(pkg, null, 2));
    copyFileSync(join(root, 'pnpm-lock.yaml'), join(cwd, 'pnpm-lock.yaml'));
    copyFileSync(
      join(root, 'pnpm-workspace.yaml'),
      join(cwd, 'pnpm-workspace.yaml'),
    );
    git('add', '.');
    git('commit', '-m', 'chore: initial release');
    git('tag', '1.0.0');
    git('remote', 'add', 'origin', remote);
    git('push', 'origin', 'main', '--tags');
    if (branch !== 'main') git('checkout', '-b', branch);
    writeFileSync(join(cwd, 'feature.txt'), 'fixture\n');
    git('add', '.');
    git('commit', '-m', 'feat: add backup fixture');
    git('push', '-u', 'origin', branch);
    const result = await semanticRelease(
      {
        ...config,
        repositoryUrl: pathToFileURL(remote).href,
        dryRun: true,
        ci: false,
        plugins: [
          ['@semantic-release/commit-analyzer', { preset: 'angular' }],
          '@semantic-release/release-notes-generator',
        ],
      },
      { cwd, env, stdout: output, stderr: output },
    );
    const version = branch === 'main' ? '1.1.0' : `1.1.0-${branch}.1`;
    assert.ok(result && result.nextRelease, log);
    assert.equal(result.nextRelease.version, version);
    assert.equal(git('tag', '--list').toString().trim(), '1.0.0');
    const lockfile = readFileSync(join(cwd, 'pnpm-lock.yaml'), 'utf8');
    await npmPlugin.prepare(
      { npmPublish: false },
      {
        cwd,
        env,
        stdout: output,
        stderr: output,
        nextRelease: { version },
        logger: { log() {}, error() {} },
      },
    );
    assert.equal(
      JSON.parse(readFileSync(join(cwd, 'package.json'))).version,
      version,
    );
    assert.equal(readFileSync(join(cwd, 'pnpm-lock.yaml'), 'utf8'), lockfile);
    execFileSync(
      'corepack',
      ['pnpm', 'install', '--lockfile-only', '--frozen-lockfile', '--offline'],
      { cwd, env, stdio: 'pipe' },
    );
    console.log(`Release checks passed (${branch}: ${version}).`);
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
