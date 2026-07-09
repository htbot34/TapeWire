/** @type {import('next').NextConfig} */

// STATIC_EXPORT=1 produces a fully static build for GitHub Pages (the CI
// workflow also removes app/api first — route handlers can't be exported).
// NEXT_PUBLIC_BASE_PATH is the Pages subpath, e.g. "/TapeWire".
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  ...(isStaticExport ? { output: "export", trailingSlash: true } : {}),
};

export default nextConfig;
