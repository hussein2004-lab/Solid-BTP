const createNextIntlPlugin = require("next-intl/plugin");

// Points the plugin at the request config above (default path ./i18n/request.ts).
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withNextIntl(nextConfig);
