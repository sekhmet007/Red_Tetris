export default {
    testEnvironment: 'jest-environment-jsdom',
    roots: ['<rootDir>/src', '<rootDir>/__tests__'], // Ajoutez __tests__
    testMatch: ['<rootDir>/__tests__/**/*.test.js'], // Assurez-vous que le pattern correspond
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest',
    },
    moduleNameMapper: {
        '\\.(css|scss)$': 'identity-obj-proxy', // Gestion des styles
    },
    transformIgnorePatterns: ['/node_modules/'],
    moduleDirectories: ['node_modules', 'src'],
    collectCoverage: true,
    collectCoverageFrom: ['<rootDir>/src/**/*.jsx'], // Incluez les fichiers .jsx
    setupFilesAfterEnv: ['<rootDir>/node_modules/@testing-library/jest-dom'],
    coverageDirectory: '<rootDir>/coverage',
};