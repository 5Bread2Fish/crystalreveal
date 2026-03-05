import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: '/crystalreveal',
    experimental: {
        serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    },
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
    async redirects() {
        return [
            {
                source: '/',
                destination: '/en',
                permanent: false,
            },
            {
                source: '/crystalreveal',
                destination: '/crystalreveal/en',
                basePath: false,
                permanent: false,
            },
            {
                source: '/crystalreveal/',
                destination: '/crystalreveal/en',
                basePath: false,
                permanent: false,
            },
        ];
    },
};

export default withNextIntl(nextConfig);
