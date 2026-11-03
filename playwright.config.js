
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",

  use: {
    baseURL: "http://127.0.0.1:8080",
    browserName: "chromium"
  },

  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: true,
    timeout: 30000
  }
});
