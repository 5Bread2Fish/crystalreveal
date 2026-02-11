/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.public.blob.vercel-storage.com',
            },
            {
                protocol: 'https',
                hostname: 'perq6emltcwllrmw.public.blob.vercel-storage.com',
            },
        ],
    },
};

export default nextConfig;
