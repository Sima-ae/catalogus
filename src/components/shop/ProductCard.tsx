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
import { formatPrice, hasPublicOriginalPrice, isZeroPrice } from '@/lib/format-price'
import { catalogCardDescription } from '@/lib/yupoo/import-text'
import { shouldUnoptimizeProductImage, productImageSrc } from '@/lib/product-image-url'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import PricelistStarButton from '@/components/pricelist/PricelistStarButton'
import ProductCardDeleteButton from '@/components/shop/ProductCardDeleteButton'
import ProductRibbon from '@/components/shop/ProductRibbon'
import ProductOptionSelector, { ProductOptionLabels } from '@/components/shop/ProductOptionSelector'
import {
  allOptionsSelected,
  optionPriceRange,
  productHasOptions,
  resolveSelectedOptionPrices,
} from '@/lib/product-options'
import { useI18n } from '@/lib/i18n-context'
import { useState } from 'react'

interface ProductCardProps {
  product: Product
  onDeleted?: (productId: string) => void
}

export default function ProductCard({ product, onDeleted }: ProductCardProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const localizedPath = useLocalizedPath()
  const { addItem, isInCart, getItemQuantity } = useCart()
  const { theme } = useTheme()
  const { catalogMode } = useCatalogMode()
  const { showCardDetails } = useProductCardDisplay()
  const { t } = useI18n()
  const [isAdding, setIsAdding] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [optionError, setOptionError] = useState<string | null>(null)

  const hasOptions = productHasOptions(product.product_options)
  const displayPrices = resolveSelectedOptionPrices(
    product.price,
    product.original_price,
    product.product_options,
    selectedOptions
  )
  const priceRange = optionPriceRange(product.product_options)
  const showPriceRange =
    hasOptions &&
    !allOptionsSelected(product.product_options, selectedOptions) &&
    priceRange != null &&
    priceRange.max > priceRange.min
  const productOptionKey = hasOptions
    ? Object.values(selectedOptions).filter(Boolean).join('|')
    : undefined
  
  const handleAddToCart = async () => {
    if (hasOptions && !allOptionsSelected(product.product_options, selectedOptions)) {
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
  const flipImage = productImageSrc(product.gallery_images?.[0]?.trim() || product.image_url)

  return (
    <div
      data-product-id={product.id}
      className={`card group relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 w-full ${
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
        <div className={`relative aspect-[3/4] mb-3 overflow-hidden rounded-lg product-card-flip ${
          theme === 'dark' ? 'bg-dark-900' : 'bg-white'
        }`}>
          <div className="product-card-flip-inner">
            <div className="product-card-flip-face">
              <Image
                src={mainImage}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
                className="object-contain"
                unoptimized={shouldUnoptimizeProductImage(mainImage)}
              />
            </div>
            <div className="product-card-flip-face product-card-flip-back">
              <Image
                src={flipImage}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
                className="object-contain"
                unoptimized={shouldUnoptimizeProductImage(flipImage)}
              />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 z-[1] bg-black bg-opacity-0 transition-all duration-300 group-hover:bg-opacity-20" />
          <div className="absolute top-2 left-2 z-10">
            <ProductCardDeleteButton
              productId={product.id}
              productName={product.name}
              size="sm"
              onDeleted={() => onDeleted?.(product.id)}
            />
          </div>
          <div className="absolute top-2 right-2 z-10">
            <PricelistStarButton productId={product.id} size="sm" />
          </div>
        </div>
      </Link>
      
      <div className="space-y-2">
        <Link
          href={localizedPath(`/product/${product.id}`)}
          className="block"
          scroll={false}
          onClick={saveListingScroll}
        >
          <h3 className={`font-semibold text-xs sm:text-sm line-clamp-2 leading-tight transition-colors ${
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
          {hasOptions && product.product_options ? (
            <ProductOptionSelector
              groups={product.product_options}
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
          ) : null}
          {optionError ? (
            <p className="text-red-500 text-xs">{optionError}</p>
          ) : null}
        <div className="flex items-center justify-between">
          <div className="flex flex-col min-w-0 gap-0.5">
            {hasPublicOriginalPrice(displayPrices.original_price, displayPrices.price) ? (
              <span className={`line-through text-xs truncate transition-colors ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {formatPrice(displayPrices.original_price)}
              </span>
            ) : null}
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              {showPriceRange ? (
                <span className="text-sm sm:text-base font-bold text-primary-500 truncate">
                  {formatPrice(priceRange!.min)} – {formatPrice(priceRange!.max)}
                </span>
              ) : (
                <span className="text-sm sm:text-base font-bold text-primary-500 truncate">
                  {isZeroPrice(hasOptions ? displayPrices.price : product.price)
                    ? t('product.priceOnRequest')
                    : formatPrice(hasOptions ? displayPrices.price : product.price)}
                </span>
              )}
              {hasOptions && product.product_options ? (
                <ProductOptionLabels groups={product.product_options} />
              ) : null}
            </div>
          </div>
          
          {!catalogMode && (
            <div className="flex items-center space-x-2">
              {inCart ? (
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className="btn-primary text-xs py-1 px-2 flex-shrink-0 bg-green-600 hover:bg-green-700"
                  >
                    {isAdding ? 'Adding...' : `In Cart (${quantity})`}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="btn-primary text-xs py-1 px-2 flex-shrink-0"
                >
                  {isAdding ? 'Adding...' : 'Add to Cart'}
                </button>
              )}
            </div>
          )}
        </div>
        </div>
        ) : null}
      </div>
    </div>
  )
}
