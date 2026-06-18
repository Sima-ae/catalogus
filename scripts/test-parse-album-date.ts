import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  normalizeYupooAlbumDate,
  parseYupooAlbumDateFromHtml,
} from '../src/lib/yupoo/parse-album-date'

assert.equal(normalizeYupooAlbumDate('2025-03-04'), '2025-03-04')
assert.equal(normalizeYupooAlbumDate('2026/6/9'), '2026-06-09')
assert.equal(normalizeYupooAlbumDate(''), null)

const ghxyHtml = readFileSync(resolve('/tmp/ghxy-album.html'), 'utf8')
assert.equal(parseYupooAlbumDateFromHtml(ghxyHtml), '2025-03-04')

const sample = `<script type="application/ld+json">
{"@context":"https://schema.org","@type":"ImageGallery","datePublished":"2024-11-20"}
</script>`
assert.equal(parseYupooAlbumDateFromHtml(sample), '2024-11-20')

console.log('parse-album-date tests OK')
