import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appConfig } from './app.config';

describe('Environment file compatibility', () => {
  let directory: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = {};
    directory = mkdtempSync(join(tmpdir(), 'bwsh-env-'));
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(directory, { recursive: true, force: true });
  });

  it('preserves inherited values and gives the first file precedence', () => {
    process.env.EXISTING = 'inherited';
    const first = join(directory, 'first.env');
    const second = join(directory, 'second.env');
    writeFileSync(first, 'EXISTING=file\nSHARED=first\n');
    writeFileSync(second, 'SHARED=second\nADDITIONAL=value\n');
    appConfig.loadEnvFiles([first, second]);
    expect(process.env).toMatchObject({
      EXISTING: 'inherited',
      SHARED: 'first',
      ADDITIONAL: 'value',
    });
  });

  it('expands chained variables, defaults, empty values and commands', () => {
    const file = join(directory, 'expansion.env');
    writeFileSync(
      file,
      'BASE=base\nCHAIN=${BASE}/child\nRESULT=${CHAIN}/leaf\nDEFAULT=${MISSING:-fallback}\nEMPTY=\nCOMMAND=$(echo executed)\n',
    );
    appConfig.loadEnvFiles([file]);
    expect(process.env).toMatchObject({
      RESULT: 'base/child/leaf',
      DEFAULT: 'fallback',
      EMPTY: '',
      COMMAND: 'executed',
    });
    appConfig.loadEnvFiles([file]);
    expect(process.env.RESULT).toBe('base/child/leaf');
  });

  it('tolerates missing files while loading subsequent files', () => {
    const file = join(directory, 'present.env');
    writeFileSync(file, 'PRESENT=yes\n');
    appConfig.loadEnvFiles([join(directory, 'missing.env'), file]);
    expect(process.env.PRESENT).toBe('yes');
  });
});
