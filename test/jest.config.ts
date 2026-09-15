import type { Config } from 'jest';

const defaultCfg: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
};

const unitCfg: Config = Object.assign({}, defaultCfg, <Config>{
  displayName: 'unit',
  moduleNameMapper: {
    '^src/(.*)': '<rootDir>/$1',
    '^test/(.*)': '<rootDir>/../test/$1',
  },
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
});

const e2eCfg: Config = Object.assign({}, defaultCfg, <Config>{
  displayName: 'e2e',
  moduleNameMapper: {
    '^src/(.*)': '<rootDir>/src/$1',
    '^test/(.*)': '<rootDir>/test/$1',
  },
  rootDir: '.',
  testRegex: 'test/e2e/.*\\.e2e-spec\\.ts$',
});

const config: Config = {
  rootDir: '..',
  projects: [unitCfg, e2eCfg],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/features/bitwarden/model/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};

export default config;
