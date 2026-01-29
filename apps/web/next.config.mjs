/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'potrace', 'jimp'],
  },
  webpack: (config, { dev, isServer, webpack }) => {
    if (!dev) {
      config.cache = false;
    }

    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        sharp: 'commonjs sharp',
        potrace: 'commonjs potrace',
        jimp: 'commonjs jimp',
      });
    }

    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/node\/(self|extend|canvas)\.js$/,
      })
    );

    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        canvas: false,
        jsdom: false,
        'jsdom/lib/jsdom/living/generated/utils': false,
        'paper/dist/node/self.js': false,
        'paper/dist/node/extend.js': false,
        'paper/dist/node/canvas.js': false,
      };
      // Ignore Node.js modules for client-side (js-angusj-clipper)
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
      };
    }

    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        has: [
          {
            type: 'header',
            key: 'x-local-api',
            value: 'true',
          },
        ],
        destination: '/api/:path*',
      },
      {
        source: '/api/((?!ai|artifacts|billing|bulk-name-tags|entitlements|feedback|health|multilayer|stripe|tours|trace).*)',
        destination: 'http://api:4000/:1',
      },
    ];
  },
};

export default nextConfig;
