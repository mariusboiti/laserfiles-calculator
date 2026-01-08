module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.spec.js'],
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
};
