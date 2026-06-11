'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Product } from '@/lib/types'
import { saveCatalogNavState } from '@/lib/catalog-scroll-restore'
import { catalogListingKey, isShopCatalogPath, parseCatalogPageParam } from '@/lib/shop-catalog-url'
import { useLocalizedPath } from '@/lib/use-localized-path'
import { useCatalogMode } from '@/lib/catalog-mode-context'
import { useProductCardDisplay } from '@/lib/product-card-display-context'
import { formatPrice, isZeroPrice } from '@/lib/format-price'
import { catalogCardDescription } from '@/lib/yupoo/import-text'
import { shouldUnoptimizeProductImage, productImageSrc } from '@/lib/product-image-url'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import PricelistStarButton from '@/components/pricelist/PricelistStarButton'
import ProductCardDeleteButton from '@/components/shop/ProductCardDeleteButton'
import ProductRibbon from '@/components/shop/ProductRibbon'
import ProductOptionSelector, {
  ProductFixedOptionDisplay,
  ProductOptionLabels,
} from '@/components/shop/ProductOptionSelector'
import ProductOptionPrice from '@/components/shop/ProductOptionPrice'
import { useProductOptionSelection } from '@/components/shop/use-product-option-selection'
import {
  allOptionsSelected,
  getShopProductOptions,
  isSingleFixedProductOption,
  optionPriceRange,
  shopProductHasOptions,
} from '@/lib/product-options'
import { useI18n } from '@/lib/i18n-context'
import { memo, useMemo, useState } from 'react'

interface ProductCardProps {
  product: Product
  onDeleted?: (productId: string) => void
}

function ProductCard({ product, onDeleted }: ProductCardProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const localizedPath = useLocalizedPath()
  const { addItem, isInCart, getItemQuantity } = useCart()
  const { theme } = useTheme()
  const { catalogMode } = useCatalogMode()
  const { showCardDetails } = useProductCardDisplay()
  const { t } = useI18n()
  const [isAdding, setIsAdding] = useState(false)
  const [optionError, setOptionError] = useState<string | null>(null)

  const shopProductOptions = useMemo(
    () => getShopProductOptions(product.product_options),
    [product.product_options]
  )
  const hasOptions = shopProductHasOptions(product.product_options)
  const singleFixedOption = isSingleFixedProductOption(product.product_options)
  const { selected: selectedOptions, setSelected: setSelectedOptions, displayPrices } =
    useProductOptionSelection(product.price, product.original_price, shopProductOptions)
  const productOptionKey = hasOptions
    ? Object.values(selectedOptions).filter(Boolean).join('|')
    : undefined
  
  const handleAddToCart = async () => {
    if (hasOptions && !allOptionsSelected(shopProductOptions, selectedOptions)) {
      setOptionError(t('product.select.options'))
      return
    }
    setOptionError(null)
    setIsAdding(true)
    try {
      const optionSummary = hasOptions
        ? Object.entries(selectedOptions)
            .filter(([, value]) => value)
            .map(([group, value]) => `${group}: ${value}`)
            .join(', ')
        : ''
      addItem({
        productId: product.id,
        name: optionSummary ? `${product.name} (${optionSummary})` : product.name,
        price: hasOptions ? displayPrices.price : product.price,
        original_price: hasOptions ? displayPrices.original_price ?? undefined : product.original_price,
        image_url: product.image_url,
        product_option: productOptionKey,
      })
    } finally {
      setIsAdding(false)
    }
  }

  const quantity = getItemQuantity(product.id, { product_option: productOptionKey })
  const inCart = isInCart(product.id, { product_option: productOptionKey })
  const cardDescription = catalogCardDescription(
    product.name,
    product.description,
    product.short_description,
    product.brand
  )

  const saveListingScroll = () => {
    if (!pathname || !isShopCatalogPath(pathname)) return
    const listingKey = catalogListingKey(pathname, searchParams)
    const qs = searchParams.toString()
    const returnUrl = `${pathname}${qs ? `?${qs}` : ''}`
    const page = parseCatalogPageParam(searchParams)
    saveCatalogNavState(listingKey, returnUrl, product.id, page)
  }

  const mainImage = productImageSrc(product.image_url)

  const cardPriceLabel = (() => {
    if (hasOptions) {
      const range = optionPriceRange(shopProductOptions)
      if (range && range.min > 0) return formatPrice(range.min)
      return t('product.priceOnRequest')
    }
    if (isZeroPrice(product.price)) return t('product.priceOnRequest')
    return formatPrice(product.price)
  })()

  return (
    <div
      data-product-id={product.id}
      className={`card group relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 w-full pb-10 ${
      theme === 'dark' 
        ? 'bg-dark-800 border-dark-700' 
        : 'bg-white border-gray-200'
    }`}>
      {product.sold_out ? (
        <ProductRibbon kind="soldOut" variant="card" />
      ) : product.pre_order ? (
        <ProductRibbon kind="preOrder" variant="card" />
      ) : null}
      <Link
        href={localizedPath(`/product/${product.id}`)}
        className="block"
        scroll={false}
        onClick={saveListingScroll}
      >
        <div className={`product-card-image relative aspect-[3/4] mb-3 overflow-hidden rounded-lg ${
          theme === 'dark' ? 'bg-dark-900' : 'bg-white'
        }`}>
          <Image
            src={mainImage}
            alt={product.name}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
            className="object-contain"
            unoptimized={shouldUnoptimizeProductImage(mainImage)}
          />
          <div className="pointer-events-none absolute inset-x-1.5 top-2 z-10 flex justify-center sm:inset-x-2">
            <span className="sold-out-ribbon-text inline-block max-w-full rounded-full bg-black px-3 py-1.5 text-center text-[10px] font-semibold leading-none text-white shadow-md whitespace-nowrap sm:px-4 sm:py-2 sm:text-xs">
              {cardPriceLabel}
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute bottom-2 left-2 z-20">
        <ProductCardDeleteButton
          productId={product.id}
          productName={product.name}
          size="sm"
          onDeleted={() => onDeleted?.(product.id)}
        />
      </div>
      <div className="absolute bottom-2 right-2 z-20">
        <PricelistStarButton productId={product.id} size="sm" />
      </div>
      
      <div className="space-y-2">
        <Link
          href={localizedPath(`/product/${product.id}`)}
          className="block"
          scroll={false}
          onClick={saveListingScroll}
        >
          <h3 className={`text-center font-semibold text-xs sm:text-sm line-clamp-2 leading-tight transition-colors ${
            theme === 'dark'
              ? 'text-gray-100 group-hover:text-white'
              : 'group-hover:text-primary-600'
          }`}>
            {product.name}
          </h3>
        </Link>
        
        {showCardDetails && cardDescription ? (
          <p className={`text-xs line-clamp-2 leading-tight transition-colors ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {cardDescription}
          </p>
        ) : null}

        {showCardDetails ? (
        <div className="space-y-2 pt-1">
          {shopProductOptions ? (
            singleFixedOption ? (
              <ProductFixedOptionDisplay
                groups={shopProductOptions}
                variant="card"
              />
            ) : (
              <ProductOptionSelector
                groups={shopProductOptions}
                selected={selectedOptions}
                onChange={(groupName, valueLabel) => {
                  setSelectedOptions((prev) => ({ ...prev, [groupName]: valueLabel }))
                  setOptionError(null)
                }}
                onClear={(groupName) => {
                  setSelectedOptions((prev) => {
                    const next = { ...prev }
                    delete next[groupName]
                    return next
                  })
                }}
                variant="card"
              />
            )
          ) : null}
          {optionError ? (
            <p className="text-red-500 text-xs">{optionError}</p>
          ) : null}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            {hasOptions ? (
              <ProductOptionPrice
                price={displayPrices.price}
                originalPrice={displayPrices.original_price}
                size="card"
              />
            ) : (
              <span className="text-sm sm:text-base font-bold text-primary-500 truncate">
                {isZeroPrice(product.price)
                  ? t('product.priceOnRequest')
                  : formatPrice(product.price)}
              </span>
            )}
          </div>
          {shopProductOptions && !singleFixedOption ? (
            <ProductOptionLabels
              groups={shopProductOptions}
              className={`shrink-0 text-right max-w-[48%] ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
              }`}
            />
          ) : null}
        </div>
        {!catalogMode ? (
          <div className="pt-1">
            {inCart ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding}
                className="btn-primary w-full text-xs py-2 bg-green-600 hover:bg-green-700"
              >
                {isAdding ? 'Adding...' : `In Cart (${quantity})`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding}
                className="btn-primary w-full text-xs py-2"
              >
                {isAdding ? 'Adding...' : 'Add to Cart'}
              </button>
            )}
          </div>
        ) : null}
        </div>
        ) : null}
      </div>
    </div>
  )
}

export default memo(ProductCard, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.product.price === next.product.price &&
    prev.product.sold_out === next.product.sold_out &&
    prev.product.pre_order === next.product.pre_order &&
    prev.product.image_url === next.product.image_url &&
    prev.product.name === next.product.name &&
    prev.onDeleted === next.onDeleted
  )
})
