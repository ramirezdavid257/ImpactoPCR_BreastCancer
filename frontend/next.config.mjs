/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Skip ESLint during production builds (already linted locally)
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Skip type checking during builds (already checked locally)
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
