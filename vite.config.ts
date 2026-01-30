import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  // Also check process.env for VITE_ prefixed variables (from Render/CI)
  // These should override .env file values
  const processEnvVars: Record<string, string> = {};
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('VITE_')) {
      processEnvVars[`import.meta.env.${key}`] = JSON.stringify(process.env[key]);
    }
  });

  return {
    server: {
      port: 3000,
      host: true, // Listen on all addresses including localhost and 127.0.0.1
      strictPort: true, // Exit if port is already in use
    },
    plugins: [
      react(),
      {
        name: 'copy-index-to-404',
        closeBundle() {
          // Copy index.html to 404.html for Render SPA routing
          try {
            copyFileSync('dist/index.html', 'dist/404.html');
            console.log('✓ Created 404.html for Render SPA routing');
          } catch (err) {
            console.warn('Could not create 404.html:', err);
          }
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    // Define which env vars to expose to the client
    // Process env vars from Render/CI override .env file values
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_ENVIRONMENT || mode),
      ...processEnvVars,
    },
  };
});
