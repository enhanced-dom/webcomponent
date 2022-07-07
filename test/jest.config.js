/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const path = require('path')

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  globals: {
    'ts-jest': {
      tsconfig: path.join(__dirname, 'tsconfig.json')
    }
  },
  transform: {
    "^.+\\.jsx?$": "ts-jest",
    "^.+\\.tsx?$": "ts-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!@enhanced-dom/)"
  ],
};