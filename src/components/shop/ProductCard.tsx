'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Product } from '@/lib/types'
import { saveCatalogScrollState } from '@/lib/catalog-scroll-restore'
import { catalogListingKey, isShopCatalogPath } from '@/lib/shop-catalog-url'
import { useCatalogMode } from '@/lib/catalog-mode-context'
import { useProductCardDisplay } from '@/lib/product-card-display-context'
import { formatPrice, isZeroPrice } from '@/lib/format-price'
import { catalogCardDescription } from '@/lib/yupoo/import-text'
import { shouldUnoptimizeProductImage } from '@/lib/product-image-url'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import PricelistStarButton from '@/components/pricelist/PricelistStarButton'
import { useState } from 'react'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
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
    if (!isShopCatalogPath(pathname)) return
    saveCatalogScrollState(catalogListingKey(pathname!, searchParams), product.id)
  }

  return (
    <div
      data-product-id={product.id}
      className={`card group cursor-pointer hover:shadow-xl transition-all duration-300 w-full ${
      theme === 'dark' 
        ? 'bg-dark-800 border-dark-700' 
        : 'bg-white border-gray-200'
    }`}>
      <Link
        href={`/product/${product.id}`}
        className="block"
        scroll={false}
        onClick={saveListingScroll}
      >
        <div className={`relative aspect-[3/4] mb-3 overflow-hidden rounded-lg ${
          theme === 'dark' ? 'bg-dark-900' : 'bg-gray-100'
        }`}>
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
            className="object-contain group-hover:scale-105 transition-transform duration-300"
            unoptimized={shouldUnoptimizeProductImage(product.image_url)}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
          <div className="absolute top-2 right-2 z-10">
            <PricelistStarButton productId={product.id} size="sm" />
          </div>
        </div>
      </Link>
      
      <div className="space-y-2">
        <Link
          href={`/product/${product.id}`}
          className="block"
          scroll={false}
          onClick={saveListingScroll}
        >
          <h3 className={`font-semibold text-xs sm:text-sm line-clamp-2 leading-tight transition-colors ${
            theme === 'dark' 
              ? 'group-hover:text-primary-500' 
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
          <div className="flex items-center space-x-2 min-w-0">
            {product.original_price &&
            !isZeroPrice(product.original_price) &&
            product.original_price > product.price &&
            !isZeroPrice(product.price) ? (
              <>
                <span className="text-sm sm:text-base font-bold text-primary-500 truncate">
                  {formatPrice(product.price)}
                </span>
                <span className={`line-through text-xs truncate transition-colors ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {formatPrice(product.original_price)}
                </span>
              </>
            ) : (
              <span className="text-sm sm:text-base font-bold text-primary-500 truncate">
                {formatPrice(product.price)}
              </span>
            )}
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
