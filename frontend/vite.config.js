import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  // Determine environment-specific configuration
  const isDevelopment = mode === 'development'
  const isStaging = mode === 'staging'
  const isProduction = mode === 'production'

  // Environment-specific API targets
  const getAPITarget = () => {
    if (isProduction) return 'http://backend:8000'
    if (isStaging) return 'http://backend:8000'
    return 'http://localhost:8000' // development
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: 'localhost',
      allowedHosts: [
        'refertosicuro.it',
        'www.refertosicuro.it',
        'localhost',
        '127.0.0.1'
      ],
      proxy: {
        '/api': {
          target: isDevelopment ? 'http://localhost:8000' : getAPITarget(),
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts: [
        'refertosicuro.it',
        'www.refertosicuro.it',
        'localhost',
        '127.0.0.1'
      ],
      proxy: {
        '/api': {
          target: getAPITarget(),
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: isDevelopment, // Enable sourcemap only in development
      minify: !isDevelopment,   // Minify only in non-development environments
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            utils: ['axios']
          }
        }
      }
    },

    // Define environment variables accessible in the app
    define: {
      __ENVIRONMENT__: JSON.stringify(mode),
      __DEVELOPMENT__: isDevelopment,
      __STAGING__: isStaging,
      __PRODUCTION__: isProduction,
    }
  }
})