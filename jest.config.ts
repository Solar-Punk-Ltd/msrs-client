import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@$': '<rootDir>/src', // direct import: @
    '^@/(.*)\\.(png|jpg|jpeg|gif|svg|mp3|mp4)$': '<rootDir>/src/__mocks__/fileMock.js', // mock assets
    '^@/(.*)$': '<rootDir>/src/$1', // everything else (components, libs, utils, etc.)
    '\\.(css|scss|sass)$': 'identity-obj-proxy', // mock scss/css
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/*.test.(ts|tsx)'],
};

export default config;
