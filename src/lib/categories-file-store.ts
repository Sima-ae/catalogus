import fs from 'fs'
import path from 'path'
import type { Category } from '@/lib/dev-store'

const CATEGORIES_FILE = path.join(process.cwd(), '.data', 'categories.json')

function ensureDir() {
  const dir = path.dirname(CATEGORIES_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function readCategoriesFile(): Category[] {
  try {
    if (!fs.existsSync(CATEGORIES_FILE)) return []
    const raw = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'))
    return Array.isArray(raw) ? (raw as Category[]) : []
  } catch {
    return []
  }
}

export function writeCategoriesFile(categories: Category[]): void {
  ensureDir()
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf8')
}

export function getCategoriesFilePath() {
  return CATEGORIES_FILE
}
