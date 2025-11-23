# Instrucciones rápidas (npm)

Comandos básicos desde PowerShell en `C:\proyectos\saul\sagafitmi-front`:

```powershell
npm install
npm run dev
npm run build
npm test
npm run lint
```

Instalar dependencias de desarrollo recomendadas (ejecutar una sola vez):

```powershell
npm install -D tailwindcss postcss autoprefixer prettier eslint-config-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

Después de instalar, si deseas inicializar Tailwind config (crea `tailwind.config.cjs` y `postcss.config.cjs`):

```powershell
npx tailwindcss init -p
```
