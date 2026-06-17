import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationFile = process.argv[2] ?? '003-admin-role.sql'
const sql = readFileSync(path.join(__dirname, `../database/migrations/${migrationFile}`), 'utf8')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await pool.query(sql)
console.log(`Migration ${migrationFile} applied`)
await pool.end()
