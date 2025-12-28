/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev, isServer, webpack }) => {
    if (!dev) {
      config.cache = false;
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
    return [{ source: '/api/:path*', destination: 'http://api:4000/:path*' }];
  },
};

export default nextConfig;
