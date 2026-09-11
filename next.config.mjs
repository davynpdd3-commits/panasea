/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Business logic and secrets must never be exposed to the client bundle.
  // Only variables explicitly listed here (or prefixed NEXT_PUBLIC_) reach the browser.
  env: {
    APP_NAME: "PANASEA",
  },
};

export default nextConfig;
