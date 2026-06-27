import assert from 'node:assert/strict'
import { getTopCategoryLabel, translateCategoryCompound } from '../src/lib/i18n-categories'
import { getCategoryManualI18nExtras, getCategoryManualTranslation } from '../src/lib/category-manual-translations'
import { categoryI18nKey, sanitizeTranslationMarkup } from '../src/lib/category-i18n-key'
import { slugifyCategory } from '../src/lib/category-slug'

function t(key: string): string {
  const map: Record<string, string> = {
    'category.soccer': 'Voetbal',
    'category.shirts': 'Shirts',
    'category.shorts': 'Korte broeken',
    'category.ties': 'Stropdassen',
    'category.underwear--socks': 'Ondergoed | Sokken',
    'category.bikini--swimwear': 'Bikini & Zwemkleding',
    'category.all': 'Alle',
  }
  return map[key] ?? key
}

assert.equal(sanitizeTranslationMarkup('<G ID="1">ROPA INTERIOR | CALCETINES</G>'), 'ROPA INTERIOR | CALCETINES')
assert.equal(slugifyCategory('UNDERWEAR | SOCKS'), 'underwear--socks')
assert.equal(slugifyCategory('BIKINI & SWIMWEAR'), 'bikini--swimwear')
assert.equal(slugifyCategory('BIKINI & SWIMSUIT'), 'bikini--swimsuit')

assert.equal(getCategoryManualTranslation('SHIRTS', 'nl'), 'Shirts')
assert.equal(getCategoryManualTranslation('SHORTS', 'nl'), 'Korte broeken')
assert.equal(getCategoryManualTranslation('TIES', 'nl'), 'Stropdassen')
assert.equal(getCategoryManualTranslation('TIE', 'nl'), 'Stropdassen')
assert.equal(getCategoryManualTranslation('UNDERWEAR | SOCKS', 'nl'), 'Ondergoed | Sokken')
assert.equal(getCategoryManualTranslation('BIKINI & SWIMWEAR', 'es'), 'Bikini y bañador')
assert.equal(getCategoryManualTranslation('BIKINI & SWIMSUIT', 'es'), 'Bikini y bañador')
assert.equal(categoryI18nKey('SHIRTS'), 'category.shirts')
assert.equal(categoryI18nKey('SHORTS'), 'category.shorts')
assert.equal(categoryI18nKey('TIES'), 'category.ties')
assert.equal(categoryI18nKey('UNDERWEAR | SOCKS'), 'category.underwear--socks')

assert.equal(getTopCategoryLabel('SHIRTS', t), 'Shirts')
assert.equal(getTopCategoryLabel('SHORTS', t), 'Korte broeken')
assert.equal(getTopCategoryLabel('TIES', t), 'Stropdassen')
assert.equal(getTopCategoryLabel('UNDERWEAR | SOCKS', t), 'Ondergoed | Sokken')
assert.equal(getTopCategoryLabel('BIKINI & SWIMWEAR', t), 'Bikini & Zwemkleding')
assert.equal(translateCategoryCompound('SOCCER › SHIRTS', t), 'Voetbal › Shirts')
assert.equal(translateCategoryCompound('CLOTHES › TIES', t), 'Clothes › Stropdassen')

const nlExtras = getCategoryManualI18nExtras('nl')
assert.equal(nlExtras['category.ties'], 'Stropdassen')
assert.equal(nlExtras['category.tie'], 'Stropdassen')
assert.equal(nlExtras['category.socks'], 'Sokken')
assert.equal(nlExtras['category.underwear--socks'], 'Ondergoed | Sokken')
assert.equal(nlExtras['category.bikini--swimwear'], 'Bikini & Zwemkleding')

console.log('category i18n tests passed')
