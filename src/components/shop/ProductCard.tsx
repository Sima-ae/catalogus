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
import { formatPrice, hasPublicOriginalPrice } from '@/lib/format-price'
import { catalogCardDescription } from '@/lib/yupoo/import-text'
import { shouldUnoptimizeProductImage, productImageSrc } from '@/lib/product-image-url'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import PricelistStarButton from '@/components/pricelist/PricelistStarButton'
import ProductCardDeleteButton from '@/components/shop/ProductCardDeleteButton'
import ProductSoldOutRibbon from '@/components/shop/ProductSoldOutRibbon'
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
  const [isAdding, setIsAdding] = useState(false)
  
  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        original_price: product.original_price,
        image_url: product.image_url,
      })
    } finally {
      setIsAdding(false)
    }
  }

  const quantity = getItemQuantity(product.id)
  const inCart = isInCart(product.id)
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
      className={`card group cursor-pointer hover:shadow-xl transition-all duration-300 w-full ${
      theme === 'dark' 
        ? 'bg-dark-800 border-dark-700' 
        : 'bg-white border-gray-200'
    }`}>
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
          {product.sold_out ? <ProductSoldOutRibbon /> : null}
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
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col min-w-0 gap-0.5">
            {hasPublicOriginalPrice(product.original_price, product.price) ? (
              <span className={`line-through text-xs truncate transition-colors ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {formatPrice(product.original_price)}
              </span>
            ) : null}
            <span className="text-sm sm:text-base font-bold text-primary-500 truncate">
              {formatPrice(product.price)}
            </span>
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
        ) : null}
      </div>
    </div>
  )
}
