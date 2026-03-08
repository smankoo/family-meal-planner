import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const fileEnv = loadEnv(mode, process.cwd(), '');

  // Build the final env by merging file env with process.env
  // process.env (from Render/CI) takes precedence over .env files
  const finalEnv: Record<string, string> = {};

  // First, add all VITE_ vars from .env files
  Object.keys(fileEnv).forEach(key => {
    if (key.startsWith('VITE_')) {
      finalEnv[key] = fileEnv[key];
    }
  });

  // Then, override with process.env VITE_ vars (from Render/CI)
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('VITE_') && process.env[key]) {
      finalEnv[key] = process.env[key] as string;
    }
  });

  // Log env vars during build for debugging (only in CI/production builds)
  if (process.env.RENDER || process.env.CI) {
    console.log('=== Vite Build Environment ===');
    console.log('Mode:', mode);
    console.log('VITE_API_BASE_URL:', finalEnv.VITE_API_BASE_URL || '(not set - will use localhost fallback)');
    console.log('VITE_ENVIRONMENT:', finalEnv.VITE_ENVIRONMENT || '(not set)');
    console.log('VITE_SUPABASE_URL:', finalEnv.VITE_SUPABASE_URL ? '(set)' : '(not set)');
    console.log('==============================');
  }

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
        '@': path.resolve(__dirname, './frontend'),
      }
    },
    // Define replacements for import.meta.env.VITE_* variables
    // This ensures process.env values from Render/CI are properly injected
    define: {
      __APP_ENV__: JSON.stringify(finalEnv.VITE_ENVIRONMENT || mode),
      // Explicitly define each VITE_ variable to ensure they're replaced at build time
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(finalEnv.VITE_API_BASE_URL || ''),
      'import.meta.env.VITE_ENVIRONMENT': JSON.stringify(finalEnv.VITE_ENVIRONMENT || ''),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(finalEnv.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(finalEnv.VITE_SUPABASE_ANON_KEY || ''),
      'import.meta.env.VITE_GA_MEASUREMENT_ID': JSON.stringify(finalEnv.VITE_GA_MEASUREMENT_ID || ''),
      'import.meta.env.VITE_GA_DEBUG': JSON.stringify(finalEnv.VITE_GA_DEBUG || ''),
      'import.meta.env.VITE_GA_TEST_MODE': JSON.stringify(finalEnv.VITE_GA_TEST_MODE || ''),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(finalEnv.VITE_GEMINI_API_KEY || ''),
    },
  };
});
