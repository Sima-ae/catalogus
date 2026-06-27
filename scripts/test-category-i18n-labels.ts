import assert from 'node:assert/strict'
import { getTopCategoryLabel, translateCategoryCompound } from '../src/lib/i18n-categories'
import { getCategoryManualTranslation } from '../src/lib/category-manual-translations'
import { categoryI18nKey } from '../src/lib/category-i18n-key'

function t(key: string): string {
  const map: Record<string, string> = {
    'category.soccer': 'Voetbal',
    'category.shirts': 'Shirts',
    'category.shorts': 'Korte broeken',
    'category.all': 'Alle',
  }
  return map[key] ?? key
}

assert.equal(getCategoryManualTranslation('SHIRTS', 'nl'), 'Shirts')
assert.equal(getCategoryManualTranslation('SHORTS', 'nl'), 'Korte broeken')
assert.equal(categoryI18nKey('SHIRTS'), 'category.shirts')
assert.equal(categoryI18nKey('SHORTS'), 'category.shorts')

assert.equal(getTopCategoryLabel('SHIRTS', t), 'Shirts')
assert.equal(getTopCategoryLabel('SHORTS', t), 'Korte broeken')
assert.equal(translateCategoryCompound('SOCCER › SHIRTS', t), 'Voetbal › Shirts')

console.log('category i18n tests passed')
