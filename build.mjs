import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const root = '/home/retroporter/cup';
  const outDir = path.join(root, 'dist');
  console.log('Building from root:', root);
  
  try {
    await build({
      root: root,
      plugins: [],
      resolve: {
        alias: {
          '@': path.resolve(root, './src'),
        },
      },
      build: {
        outDir: outDir,
        sourcemap: true,
        rollupOptions: {
          input: path.join(root, 'index.html')
        }
      },
      logLevel: 'info'
    });
    console.log('Build completed successfully!');
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

main();