import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // 建置期斷言：打包 Android 時一定要有 VITE_API_BASE_URL。
  // 打包後頁面 origin 是 https://localhost，相對路徑的 /api/* 會打到 WebView 自己（404）；
  // 在這裡 fail fast，比上架後才發現「翻譯全掛」便宜得多。
  //
  // 為什麼加 VITE_TARGET=android 這個門檻（與文件 §2.4 的差異，刻意為之）：
  // 同一份 dist 也供應 Netlify / Zeabur 的同源 web 部署，那裡相對路徑才是正解。
  // 若無條件斷言，所有 web 建置都會被擋下 —— 等於用一個新 bug 換一個舊 bug。
  if (mode === 'production' && process.env.VITE_TARGET === 'android' && !process.env.VITE_API_BASE_URL) {
    throw new Error(
      'missing VITE_API_BASE_URL: 建置 Android App 前請設定後端 origin（例：VITE_API_BASE_URL=https://xxx.zeabur.app）'
    );
  }

  return {
    // base 維持 '/'：改 './' 會讓 /icons/*、/manifest.json 解析錯誤
    base: '/',
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'dist',
      sourcemap: true,
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: {
            i18n: ['./src/js/i18n.js'],
            models: ['./src/js/models.js'],
          },
        },
      },
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/.netlify/functions': {
          target: 'http://localhost:8888',
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['tests/**/*.test.js'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/js/**/*.js'],
      },
    },
  };
});
