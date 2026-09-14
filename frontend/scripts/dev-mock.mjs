// 모의 BFF + Vite 개발 서버를 한 번에 띄운다: npm run dev:mock
import { spawn } from 'node:child_process'
const port = process.env.PORT || 8787
const a = spawn(process.execPath, ['../backend/mock-bff/server.mjs'], { stdio: 'inherit', env: { ...process.env, PORT: port } })
const b = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite'], { stdio: 'inherit', env: { ...process.env, VITE_BFF_URL: `http://localhost:${port}` } })
const stop = () => { a.kill(); b.kill(); process.exit() }
process.on('SIGINT', stop); process.on('SIGTERM', stop); b.on('exit', stop)
