const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    passWithNoTests: true,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};

module.exports = createJestConfig(customJestConfig);
