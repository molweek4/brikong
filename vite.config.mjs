import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // 루트 디렉토리 = 현재 폴더
  publicDir: 'public', // static 파일 폴더
  server: {
    open: true // 브라우저 자동 열기
  }
});
