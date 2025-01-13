module.exports = {
    testEnvironment: 'node',
    rootDir: './',
    testMatch: ['<rootDir>/__tests__/**/*.test.js'],
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
    },
    moduleDirectories: ['node_modules', 'src'],
    collectCoverage: true,
    collectCoverageFrom: ['<rootDir>/src/models/**/*.js'],
    coverageDirectory: '<rootDir>/coverage',
};