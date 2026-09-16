import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  utimes,
  writeFile,
} from 'fs/promises';
import { ZipReader, Uint8ArrayReader, TextWriter } from '@zip.js/zip.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { appConfig } from '../../app.config';
import { BitwardenService } from '../bitwarden/bitwarden.service';
import { BackupService } from './backup.service';

describe('BackupService', () => {
  const originalConfig = { ...appConfig.props };
  const exportMock = jest.fn();
  const getOrgs = jest.fn();
  const organizationId = '12345678-1234-1234-1234-123456789abc';
  let directory: string;
  let service: BackupService;

  beforeEach(async () => {
    jest.resetAllMocks();
    directory = await mkdtemp(join(tmpdir(), 'bwsh-backup-'));
    Object.assign(appConfig.props, {
      dataDir: directory,
      backupMaxNum: 2,
      bwSafePassword: 'test-password',
    });
    service = new BackupService({
      export: exportMock,
      getOrgs,
    } as unknown as BitwardenService);
    getOrgs.mockResolvedValue([]);
    exportMock.mockImplementation(async ({ output, organizationId }) => {
      await writeFile(output, `encrypted-${organizationId || 'personal'}`);
      return output;
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    await rm(directory, { recursive: true, force: true });
    for (const key of Object.keys(appConfig.props))
      delete (appConfig.props as any)[key];
    Object.assign(appConfig.props, originalConfig);
  });

  it('archives the personal vault before listing and exporting every organization', async () => {
    const secondId = '87654321-4321-4321-4321-cba987654321';
    getOrgs.mockResolvedValue([
      { id: organizationId, name: '../same name' },
      { id: secondId, name: '../same name' },
    ]);
    const result = await service.backup();
    expect(result.filename).toMatch(/^\d{8}-\d{6}\.zip$/);
    const zip = new ZipReader(
      new Uint8ArrayReader(
        await readFile(join(service.getBackupDir(), result.filename)),
      ),
      { useWebWorkers: false },
    );
    const entries = await zip.getEntries();
    expect(entries.map((entry) => entry.filename)).toEqual([
      'vault.json',
      'org-same-name.json',
      'org-same-name-2.json',
      'organizations.txt',
    ]);
    for (const entry of entries) {
      expect(entry.encrypted).toBe(true);
      expect(entry.zipCrypto).toBe(false);
      expect(entry.extraFieldAES?.strength).toBe(3);
      if (entry.directory) throw new Error('Unexpected directory entry');
      await expect(
        entry.getData(new TextWriter(), { password: 'wrong-password' }),
      ).rejects.toThrow();
      await expect(entry.getData(new TextWriter())).rejects.toThrow();
      expect(
        await entry.getData(new TextWriter(), {
          password: 'test-password',
          checkSignature: true,
        }),
      ).toBe(
        entry.filename === 'vault.json'
          ? 'encrypted-personal'
          : entry.filename === 'org-same-name.json'
            ? `encrypted-${organizationId}`
            : entry.filename === 'org-same-name-2.json'
              ? `encrypted-${secondId}`
              : `Filename\tOrganization ID\tOrganization name\norg-same-name.json\t${organizationId}\t"../same name"\norg-same-name-2.json\t${secondId}\t"../same name"\n`,
      );
    }
    await zip.close();
    expect(
      exportMock.mock.calls.map(([options]) => options.organizationId),
    ).toEqual([undefined, organizationId, secondId]);
    for (const [options] of exportMock.mock.calls) {
      expect(options).toEqual(
        expect.objectContaining({
          password: 'test-password',
          raw: false,
          format: 'encrypted_json',
        }),
      );
    }
    expect(exportMock.mock.invocationCallOrder[0]).toBeLessThan(
      getOrgs.mock.invocationCallOrder[0],
    );
    expect(getOrgs.mock.invocationCallOrder[0]).toBeLessThan(
      exportMock.mock.invocationCallOrder[1],
    );
    expect(await readdir(directory)).toEqual(['backup']);
  });

  it('creates a personal-only ZIP and honors filename and password overrides', async () => {
    const result = await service.backup({
      filename: 'custom.json',
      password: 'custom-password',
    });
    expect(result).toEqual({ filename: 'custom.zip' });
    const zip = new ZipReader(
      new Uint8ArrayReader(
        await readFile(join(service.getBackupDir(), result.filename)),
      ),
      { useWebWorkers: false },
    );
    const entries = await zip.getEntries();
    expect(entries.map((entry) => entry.filename)).toEqual([
      'vault.json',
      'organizations.txt',
    ]);
    const listing = entries[1];
    if (listing.directory) throw new Error('Unexpected directory entry');
    expect(
      await listing.getData(new TextWriter(), { password: 'custom-password' }),
    ).toBe('Filename\tOrganization ID\tOrganization name\n');
    const entry = entries[0];
    if (entry.directory) throw new Error('Unexpected directory entry');
    await expect(
      entry.getData(new TextWriter(), { password: 'test-password' }),
    ).rejects.toThrow();
    expect(
      await entry.getData(new TextWriter(), {
        password: 'custom-password',
        checkSignature: true,
      }),
    ).toBe('encrypted-personal');
    await zip.close();
    expect(exportMock).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'custom-password' }),
    );
  });

  it('sanitizes portable filenames and resolves collisions without losing original names', async () => {
    const names = [
      'Caffè / R&D: \"Team\"',
      'CON',
      '../..',
      '東京',
      '',
      'same-2',
      'Same',
      'SAME',
      'a'.repeat(100),
      'a'.repeat(100),
      'Line\nBreak\tName',
    ];
    const filenames = [
      'org-caffe-r-d-team.json',
      'org-con.json',
      'org-organization.json',
      'org-organization-2.json',
      'org-organization-3.json',
      'org-same-2.json',
      'org-same.json',
      'org-same-3.json',
      `org-${'a'.repeat(80)}.json`,
      `org-${'a'.repeat(80)}-2.json`,
      'org-line-break-name.json',
    ];
    const organizations = names.map((name, index) => ({
      name,
      id: `12345678-1234-1234-1234-${String(index).padStart(12, '0')}`,
    }));
    getOrgs.mockResolvedValue(organizations);
    const result = await service.backup();
    const zip = new ZipReader(
      new Uint8ArrayReader(
        await readFile(join(service.getBackupDir(), result.filename)),
      ),
      { useWebWorkers: false },
    );
    const entries = await zip.getEntries();
    expect(entries.map((entry) => entry.filename)).toEqual([
      'vault.json',
      ...filenames,
      'organizations.txt',
    ]);
    for (let index = 0; index < organizations.length; index++) {
      const entry = entries[index + 1];
      if (entry.directory) throw new Error('Unexpected directory entry');
      expect(
        await entry.getData(new TextWriter(), { password: 'test-password' }),
      ).toBe(`encrypted-${organizations[index].id}`);
    }
    const listing = entries[entries.length - 1];
    if (listing.directory) throw new Error('Unexpected directory entry');
    expect(
      await listing.getData(new TextWriter(), { password: 'test-password' }),
    ).toBe(
      'Filename\tOrganization ID\tOrganization name\n' +
        organizations
          .map(
            (organization, index) =>
              `${filenames[index]}\t${organization.id}\t${JSON.stringify(organization.name)}\n`,
          )
          .join(''),
    );
    await zip.close();
  });

  it.each(['personal', 'listing', 'organization', 'zip', 'publish'])(
    'keeps old backups and cleans temporary files when %s fails',
    async (stage) => {
      await mkdir(service.getBackupDir());
      await writeFile(join(service.getBackupDir(), 'old.json'), 'old backup');
      const prune = jest.spyOn(service, 'pruneOldBackups');
      getOrgs.mockResolvedValue([{ id: organizationId, name: 'Test Org' }]);
      if (stage === 'personal')
        exportMock.mockRejectedValueOnce(new Error('Export failed'));
      if (stage === 'listing')
        getOrgs.mockRejectedValueOnce(new Error('Listing failed'));
      if (stage === 'organization')
        exportMock
          .mockImplementationOnce(async ({ output }) =>
            writeFile(output, 'personal'),
          )
          .mockRejectedValueOnce(new Error('Organization failed'));
      if (stage === 'zip') exportMock.mockResolvedValue('missing export file');
      if (stage === 'publish')
        await mkdir(join(service.getBackupDir(), 'blocked.zip'));
      await expect(
        service.backup({ filename: 'blocked.zip' }),
      ).rejects.toThrow();
      expect(prune).not.toHaveBeenCalled();
      expect(
        await readFile(join(service.getBackupDir(), 'old.json'), 'utf8'),
      ).toBe('old backup');
      expect(await readdir(directory)).toEqual(['backup']);
      expect((await readdir(service.getBackupDir())).sort()).toEqual(
        stage === 'publish' ? ['blocked.zip', 'old.json'] : ['old.json'],
      );
    },
  );

  it.each([
    '../outside.zip',
    '/tmp/outside.zip',
    'nested/file.zip',
    '..',
    'nested\\file.zip',
  ])('rejects unsafe archive filename %s', async (filename) => {
    await expect(service.backup({ filename })).rejects.toThrow(
      'plain filename',
    );
    expect(exportMock).not.toHaveBeenCalled();
  });

  it('rejects an empty password instead of creating an unprotected ZIP', async () => {
    await expect(service.backup({ password: '' })).rejects.toThrow(
      'Backup password',
    );
    expect(exportMock).not.toHaveBeenCalled();
    expect(await readdir(directory)).toEqual([]);
  });

  it('rejects unsafe organization IDs without publishing or pruning', async () => {
    getOrgs.mockResolvedValue([{ id: '../outside' }]);
    await expect(service.backup()).rejects.toThrow('Invalid organization ID');
    expect(exportMock).toHaveBeenCalledTimes(1);
    expect(await readdir(service.getBackupDir())).toEqual([]);
    expect(await readdir(directory)).toEqual(['backup']);
  });

  it('prunes old JSON and ZIP backups only after publishing the complete archive', async () => {
    await mkdir(service.getBackupDir());
    for (const [name, time] of [
      ['z.json', 1],
      ['a.zip', 2],
    ] as const) {
      await writeFile(join(service.getBackupDir(), name), 'old');
      await utimes(join(service.getBackupDir(), name), time, time);
    }
    await service.backup({ filename: 'new.zip' });
    expect((await readdir(service.getBackupDir())).sort()).toEqual([
      'a.zip',
      'new.zip',
    ]);
  });

  it('keeps backups within the retention limit', async () => {
    await mkdir(service.getBackupDir());
    await writeFile(join(service.getBackupDir(), 'old.json'), 'old');
    await service.pruneOldBackups();
    expect(await readdir(service.getBackupDir())).toEqual(['old.json']);
  });

  it('reports pruning failures after preserving the completed archive', async () => {
    jest
      .spyOn(service, 'pruneOldBackups')
      .mockRejectedValue(new Error('Cannot prune'));
    await expect(service.backup({ filename: 'new.zip' })).rejects.toThrow(
      'Cannot prune',
    );
    expect(await readdir(service.getBackupDir())).toEqual(['new.zip']);
  });
});
