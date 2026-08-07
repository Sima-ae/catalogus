#!/usr/bin/env npx tsx
/**
 * Regression: public product (+ pricelist) share paths rewrite correctly for
 * every locale slug in the registry — locked visitors must not 404 on /{lang}/product/:id.
 */
import { LOCALE_REGISTRY } from '@/lib/i18n-locale-registry'
import { resolveLocalePathRouting } from '@/lib/locale-path-routing'
import {
  isPublicProductApiPath,
  isPublicProductPath,
  isPublicShareAssetApiPath,
} from '@/lib/public-product-path'
import { isPricelistSharePath } from '@/lib/pricelist-share-path'
import { localizedPath, parseLocaleFromPathname } from '@/lib/i18n-routing'

const PRODUCT_ID = '017bc07b-d584-4097-b7d5-7bbc2f985187'
const PRODUCT_INNER = `/product/${PRODUCT_ID}`

let failed = 0

function assert(cond: boolean, message: string) {
  if (!cond) {
    failed += 1
    console.error(`FAIL: ${message}`)
  }
}

assert(isPublicProductPath(PRODUCT_INNER), 'bare product path is public share')
assert(
  !isPublicProductPath('/product/'),
  'trailing product root is not a share path'
)
assert(
  !isPublicProductPath(`/product/${PRODUCT_ID}/extra`),
  'nested product path is not a share path'
)
assert(
  isPublicProductApiPath(`/api/products/${PRODUCT_ID}`),
  'single product API is public'
)
assert(
  !isPublicProductApiPath('/api/products'),
  'product list API is not public share'
)
assert(
  !isPublicProductApiPath(`/api/products/${PRODUCT_ID}/report-unavailable`),
  'report-unavailable is not auto-public'
)
assert(isPublicShareAssetApiPath('/api/yupoo-image'), 'yupoo-image is share asset')
assert(isPublicShareAssetApiPath('/api/catalog-mode'), 'catalog-mode is share asset')
assert(
  !isPublicShareAssetApiPath('/api/shop/bootstrap'),
  'bootstrap is not a share asset'
)

// Social preview crawlers must be allowed to fetch the OG image proxy path
// (Facebook hits /api/yupoo-image after reading og:image from the product HTML).
import { isSocialPreviewUserAgent } from '@/lib/bot-traffic'
assert(
  isSocialPreviewUserAgent(
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
  ),
  'facebookexternalhit is a social preview UA'
)
assert(
  isSocialPreviewUserAgent('meta-externalagent/1.1'),
  'meta-externalagent is a social preview UA'
)

const bare = resolveLocalePathRouting(PRODUCT_INNER, 'nl')
assert(bare.action === 'redirect', 'bare product redirects to add locale')
if (bare.action === 'redirect') {
  assert(bare.pathname === `/nl${PRODUCT_INNER}`, `bare → ${bare.pathname}`)
  assert(bare.locale === 'nl', 'bare redirect uses cookie locale')
}

for (const meta of LOCALE_REGISTRY) {
  const localized = `/${meta.slug}${PRODUCT_INNER}`
  assert(
    isPublicProductPath(localized),
    `${meta.code}: isPublicProductPath(${localized})`
  )

  const parsed = parseLocaleFromPathname(localized)
  assert(parsed.locale === meta.code, `${meta.code}: parse locale`)
  assert(
    parsed.pathnameWithoutLocale === PRODUCT_INNER,
    `${meta.code}: strip → ${parsed.pathnameWithoutLocale}`
  )

  const resolved = resolveLocalePathRouting(localized, 'en')
  assert(resolved.action === 'rewrite', `${meta.code}: rewrite action`)
  if (resolved.action === 'rewrite') {
    assert(
      resolved.pathname === PRODUCT_INNER,
      `${meta.code}: rewrite target ${resolved.pathname}`
    )
    assert(resolved.locale === meta.code, `${meta.code}: rewrite locale`)
  }

  const built = localizedPath(PRODUCT_INNER, meta.code)
  assert(built === localized, `${meta.code}: localizedPath round-trip ${built}`)

  const pricelistLocalized = `/${meta.slug}/pricelist`
  assert(
    isPricelistSharePath(pricelistLocalized, 'owner-1'),
    `${meta.code}: pricelist share with owner`
  )
  assert(
    !isPricelistSharePath(pricelistLocalized, null),
    `${meta.code}: pricelist without owner is not share`
  )
}

const unknown = resolveLocalePathRouting(`/xx${PRODUCT_INNER}`, 'de')
assert(
  unknown.action === 'redirect',
  'unknown first segment is not treated as locale'
)
if (unknown.action === 'redirect') {
  assert(
    unknown.pathname === `/de/xx${PRODUCT_INNER}`,
    `unknown segment redirects under cookie locale: ${unknown.pathname}`
  )
}

for (const meta of LOCALE_REGISTRY) {
  const gate = `/${meta.slug}/site-access-gate`
  const gateResolved = resolveLocalePathRouting(gate, 'en')
  assert(gateResolved.action === 'rewrite', `${meta.code}: gate rewrite`)
  if (gateResolved.action === 'rewrite') {
    assert(
      gateResolved.pathname === '/site-access-gate',
      `${meta.code}: gate target ${gateResolved.pathname}`
    )
  }
}

const bareGate = resolveLocalePathRouting('/site-access-gate', 'fr')
assert(bareGate.action === 'redirect', 'bare gate redirects to add locale when routed')
if (bareGate.action === 'redirect') {
  assert(bareGate.pathname === '/fr/site-access-gate', bareGate.pathname)
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed across ${LOCALE_REGISTRY.length} locales`)
  process.exit(1)
}

console.log(
  `OK: public product locale routing for all ${LOCALE_REGISTRY.length} languages`
)
