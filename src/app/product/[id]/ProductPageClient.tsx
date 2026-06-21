'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Sidebar, { SidebarMenuButton, useMobileSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, StarIcon, XMarkIcon, TruckIcon, ShieldCheckIcon, CreditCardIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { appPath } from '@/lib/paths'
import { useLocalizedPath } from '@/lib/use-localized-path'
import { getCatalogNavState } from '@/lib/catalog-scroll-restore'
import { parseJsonResponse } from '@/lib/fetch-json'
import { formatPrice, isZeroPrice } from '@/lib/format-price'
import { toProductPageView, type ProductPageView } from '@/lib/product-page'
import { catalogDetailImageSrc, shouldUnoptimizeProductImage } from '@/lib/product-image-url'
import ProductImageWatermark from '@/components/shop/ProductImageWatermark'
import ProductRibbon from '@/components/shop/ProductRibbon'
import ProductFeaturedTipBadge from '@/components/shop/ProductFeaturedTipBadge'
import { useCatalogMode } from '@/lib/catalog-mode-context'
import { useAuth } from '@/lib/auth-local'
import ProductEditModal from '@/components/admin/ProductEditModal'
import { APP_DEFAULT_PRODUCT_VERSION } from '@/lib/brand'
import PricelistStarButton from '@/components/pricelist/PricelistStarButton'
import ProductCardDeleteButton from '@/components/shop/ProductCardDeleteButton'
import ProductOptionSelector, {
  ProductFixedOptionDisplay,
} from '@/components/shop/ProductOptionSelector'
import ProductOptionPrice from '@/components/shop/ProductOptionPrice'
import { useProductOptionSelection } from '@/components/shop/use-product-option-selection'
import {
  allOptionsSelected,
  getShopProductOptions,
  isSingleFixedProductOption,
  resolveSelectedOptionPrices,
  shopProductHasOptions,
} from '@/lib/product-options'
import { useI18n } from '@/lib/i18n-context'
import { getTopCategoryLabel } from '@/lib/i18n-categories'
import { getTagLabel } from '@/lib/i18n-tags'
import { useShopCategories } from '@/lib/use-shop-categories'
import {
  shopBrandFilterUrl,
  shopCategoryFilterUrl,
} from '@/lib/shop-catalog-filter-url'

type ProductReview = {
  id: string
  user_name: string
  rating: number
  title: string | null
  comment: string | null
  created_at: string
}

export default function ProductPageClient() {
  const params = useParams()
  const router = useRouter()
  const productId = typeof params.id === 'string' ? params.id : ''
  const { addItem, isInCart, getItemQuantity } = useCart()
  const { theme } = useTheme()
  const { t } = useI18n()
  const toLocalizedPath = useLocalizedPath()
  const categoryRows = useShopCategories()
  const shopBasePath = toLocalizedPath('/')
  const [product, setProduct] = useState<ProductPageView | null>(null)
  const shopProductOptions = useMemo(
    () => getShopProductOptions(product?.productOptions ?? null),
    [product?.productOptions]
  )
  const {
    selected: selectedOptions,
    setSelected: setSelectedOptions,
    displayPrices,
  } = useProductOptionSelection(
    product?.price ?? 0,
    product?.original_price ?? null,
    shopProductOptions
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedLicense, setSelectedLicense] = useState('standard')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [variantError, setVariantError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [headerSearch, setHeaderSearch] = useState('')
  const { mobileOpen, open, close } = useMobileSidebar()
  const { catalogMode } = useCatalogMode()
  const { isAdmin, isSuperAdmin, loading: authLoading } = useAuth()
  const canEditProduct = !authLoading && (isAdmin || isSuperAdmin)
  const [editOpen, setEditOpen] = useState(false)
  const thumbListRef = useRef<HTMLDivElement>(null)
  const mainGalleryRef = useRef<HTMLDivElement>(null)
  const [thumbColumnHeight, setThumbColumnHeight] = useState<number | null>(null)
  const lightboxRef = useRef<HTMLDivElement>(null)
  const lightboxTouchStart = useRef<{ x: number; y: number } | null>(null)
  const lightboxDidSwipe = useRef(false)

  const categoryHref = useMemo(() => {
    if (!product?.category) return shopBasePath
    return shopCategoryFilterUrl(
      categoryRows,
      {
        categoryId: product.category_id,
        categoryName: product.category,
      },
      shopBasePath
    )
  }, [product, categoryRows, shopBasePath])

  const brandLinks = useMemo(() => {
    if (!product) return []
    return product.brands.map((brandItem) => ({
      ...brandItem,
      href: shopBrandFilterUrl(brandItem.name, shopBasePath),
    }))
  }, [product, shopBasePath])

  useEffect(() => {
    const main = mainGalleryRef.current
    if (!main || !product || product.gallery.length <= 1) {
      setThumbColumnHeight(null)
      return
    }

    const mobileMq = window.matchMedia('(max-width: 640px)')
    if (mobileMq.matches) {
      setThumbColumnHeight(null)
      return
    }

    let frame = 0
    const syncHeight = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const h = Math.round(main.getBoundingClientRect().height)
        if (h > 0) setThumbColumnHeight((prev) => (prev === h ? prev : h))
      })
    }

    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(main)
    window.addEventListener('resize', syncHeight)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', syncHeight)
    }
  }, [product])

  useEffect(() => {
    if (!product?.gallery?.length) return
    const preloadAt = (index: number) => {
      if (index < 0 || index >= product.gallery.length) return
      const src = catalogDetailImageSrc(product.gallery[index], product.source_url)
      if (!src) return
      const img = new window.Image()
      img.decoding = 'async'
      img.src = src
    }
    preloadAt(selectedImage + 1)
    preloadAt(selectedImage - 1)
  }, [product, selectedImage])

  useEffect(() => {
    const list = thumbListRef.current
    if (!list) return
    const active = list.querySelector<HTMLElement>('[aria-selected="true"]')
    active?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }, [selectedImage, product?.gallery.length])

  const reloadProduct = useCallback(async () => {
    if (!productId) return
    try {
      const res = await fetch(appPath(`/api/products/${productId}`), { cache: 'no-store' })
      const data = await parseJsonResponse<Record<string, unknown> & { error?: string }>(res)
      if (!res.ok) return
      setProduct(toProductPageView(data))
      setSelectedImage(0)
    } catch {
      /* keep current view */
    }
  }, [productId])

  useEffect(() => {
    if (!productId) {
      setLoadError('Invalid product')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)

    fetch(appPath(`/api/products/${productId}`), {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await parseJsonResponse<Record<string, unknown> & { error?: string }>(res)
        if (!res.ok) {
          throw new Error(
            typeof data.error === 'string' ? data.error : 'Product not found'
          )
        }
        setProduct(toProductPageView(data))
        setSelectedImage(0)
        setSelectedSize('')
        setSelectedColor('')
        setVariantError(null)
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        setLoadError(e instanceof Error ? e.message : 'Failed to load product')
        setProduct(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [productId])

  useEffect(() => {
    if (!productId) return
    const controller = new AbortController()
    fetch(appPath(`/api/reviews?product_id=${encodeURIComponent(productId)}`), {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok || !Array.isArray(data)) {
          setReviews([])
          return
        }
        setReviews(data as ProductReview[])
      })
      .catch(() => {
        if (!controller.signal.aborted) setReviews([])
      })
    return () => controller.abort()
  }, [productId])

  useEffect(() => {
    if (!lightboxOpen || !product) return
    const count = product.gallery.length
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setLightboxOpen(false)
        return
      }
      if (count <= 1) return
      if (e.key === 'ArrowLeft' || e.key === 'Left') {
        e.preventDefault()
        setSelectedImage((i) => (i - 1 + count) % count)
      }
      if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault()
        setSelectedImage((i) => (i + 1) % count)
      }
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown, true)
    requestAnimationFrame(() => lightboxRef.current?.focus())
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [lightboxOpen, product])

  const goToPreviousImage = () => {
    if (!product || product.gallery.length <= 1) return
    setSelectedImage((i) => (i - 1 + product.gallery.length) % product.gallery.length)
  }

  const goToNextImage = () => {
    if (!product || product.gallery.length <= 1) return
    setSelectedImage((i) => (i + 1) % product.gallery.length)
  }

  const handleLightboxTouchStart = (e: React.TouchEvent) => {
    lightboxDidSwipe.current = false
    const t = e.touches[0]
    if (!t) return
    lightboxTouchStart.current = { x: t.clientX, y: t.clientY }
  }

  const handleLightboxTouchEnd = (e: React.TouchEvent) => {
    const start = lightboxTouchStart.current
    lightboxTouchStart.current = null
    if (!start || !product || product.gallery.length <= 1) return
    const t = e.changedTouches[0]
    if (!t) return
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
    lightboxDidSwipe.current = true
    if (dx > 0) goToPreviousImage()
    else goToNextImage()
  }

  const closeLightbox = () => {
    if (lightboxDidSwipe.current) {
      lightboxDidSwipe.current = false
      return
    }
    setLightboxOpen(false)
  }

  const handleAddToCart = async () => {
    if (!product) return

    const hasOptions = shopProductHasOptions(product.productOptions)
    const needsOptions = hasOptions && !allOptionsSelected(shopProductOptions, selectedOptions)
    const needsSize = product.availableSizes.length > 0 && !selectedSize
    const needsColor = product.availableColors.length > 0 && !selectedColor
    if (needsOptions || needsSize || needsColor) {
      setVariantError(
        needsOptions
          ? t('product.select.options')
          : needsSize && needsColor
            ? t('product.select.sizeAndColor')
            : needsSize
              ? t('product.select.size')
              : t('product.select.color')
      )
      return
    }

    const { price: optionPrice, original_price: optionOriginal } = resolveSelectedOptionPrices(
      product.price,
      product.original_price,
      shopProductOptions,
      selectedOptions
    )
    const optionSummary = hasOptions
      ? Object.entries(selectedOptions)
          .filter(([, value]) => value)
          .map(([group, value]) => `${group}: ${value}`)
          .join(', ')
      : ''
    const productOptionKey = hasOptions
      ? Object.values(selectedOptions).filter(Boolean).join('|')
      : undefined

    setVariantError(null)
    setIsAdding(true)
    try {
      addItem({
        productId: product.id,
        name: optionSummary ? `${product.name} (${optionSummary})` : product.name,
        price: hasOptions ? optionPrice : (selectedLicenseOption?.price ?? product.price),
        original_price: hasOptions ? optionOriginal ?? undefined : product.original_price,
        image_url: product.image_url,
        size: selectedSize || undefined,
        color: selectedColor || undefined,
        product_option: productOptionKey,
      })
    } finally {
      setIsAdding(false)
    }
  }

  const productOptionKey = shopProductHasOptions(product?.productOptions)
    ? Object.values(selectedOptions).filter(Boolean).join('|')
    : undefined
  const cartVariant = {
    size: selectedSize || undefined,
    color: selectedColor || undefined,
    product_option: productOptionKey,
  }
  const quantityInCart = product ? getItemQuantity(product.id, cartVariant) : 0
  const inCart = product ? isInCart(product.id, cartVariant) : false

  const licenseOptions =
    product && !shopProductHasOptions(product.productOptions)
    ? [
        {
          id: 'standard',
          name: t('product.license.standard'),
          price: product.price,
          description: t('product.license.standard.desc'),
        },
        {
          id: 'extended',
          name: t('product.license.extended'),
          price: product.price * 2.5,
          description: t('product.license.extended.desc'),
        },
        {
          id: 'unlimited',
          name: t('product.license.unlimited'),
          price: product.price * 4,
          description: t('product.license.unlimited.desc'),
        },
      ]
    : []

  const selectedLicenseOption = licenseOptions.find((option) => option.id === selectedLicense)

  const goBackToListing = () => {
    const nav = getCatalogNavState()
    if (nav?.returnUrl) {
      router.replace(nav.returnUrl, { scroll: false })
      return
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(appPath('/'))
  }

  if (loading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${
          theme === 'dark' ? 'bg-dark-900 text-gray-400' : 'bg-gray-50 text-gray-600'
        }`}
      >
        {t('product.loading')}
      </div>
    )
  }

  if (loadError || !product) {
    return (
      <div
        className={`flex min-h-screen flex-col items-center justify-center gap-4 px-4 ${
          theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
        }`}
      >
        <p className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>
          {loadError || 'Product not found'}
        </p>
        <button type="button" onClick={goBackToListing} className="btn-primary">
          {t('product.backToShop')}
        </button>
      </div>
    )
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
    } overflow-x-hidden`}>
      <ProductEditModal
        productId={productId}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          void reloadProduct()
        }}
      />

      <Sidebar open={mobileOpen} onClose={close} />

      <div className="flex-1 flex flex-col min-w-0">
        <AppStickyHeader
          title=""
          showSocialProof
          searchPlaceholder={t('shop.home.searchPlaceholder')}
          searchValue={headerSearch}
          onSearchChange={setHeaderSearch}
          onSearchSubmit={(query) => {
            const trimmed = query.trim()
            router.push(
              trimmed
                ? `${appPath('/')}?search=${encodeURIComponent(trimmed)}`
                : appPath('/')
            )
          }}
          leading={<SidebarMenuButton open={mobileOpen} onOpen={open} />}
          actions={<ShopHeroHeaderActions cartBadgeCount={quantityInCart} />}
        />

        {canEditProduct ? (
          <div className="flex justify-end px-4 sm:px-6 lg:px-8 pt-2 pb-1">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors ${
                theme === 'dark'
                  ? 'border-dark-600 bg-dark-800 text-white hover:bg-dark-700'
                  : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
              }`}
            >
              <PencilSquareIcon className="h-4 w-4 shrink-0" aria-hidden />
              {t('product.editProduct')}
            </button>
          </div>
        ) : null}

        <main
          className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-colors duration-200 app-readable ${
            theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Image Gallery (thumb column height synced to main image) */}
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            {product.gallery.length > 1 ? (
              <div
                ref={thumbListRef}
                className="product-gallery-thumbs flex w-[4.5rem] shrink-0 flex-col gap-2 overflow-y-auto overscroll-y-contain pr-0.5 sm:w-[5.25rem]"
                style={
                  thumbColumnHeight != null
                    ? { height: thumbColumnHeight, maxHeight: thumbColumnHeight }
                    : { maxHeight: 'min(75vh, 720px)' }
                }
                role="tablist"
                aria-label="Product images"
              >
                {product.gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={selectedImage === index}
                    aria-label={t('product.imageNOfM', {
                      index: index + 1,
                      total: product.gallery.length,
                    })}
                    onClick={() => setSelectedImage(index)}
                    className="product-gallery-thumb-btn"
                  >
                    <Image
                      src={catalogDetailImageSrc(image, product.source_url)}
                      alt=""
                      fill
                      sizes="84px"
                      className="object-contain p-1"
                      unoptimized={shouldUnoptimizeProductImage(image)}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <div ref={mainGalleryRef} className="min-w-0 flex-1 relative">
              <div
                className={`absolute top-3 z-20 ${product.featured ? 'left-14 sm:left-16' : 'left-3'}`}
              >
                <ProductCardDeleteButton
                  productId={product.id}
                  productName={product.name}
                  size="md"
                  onDeleted={goBackToListing}
                />
              </div>
              <div className="absolute top-3 right-3 z-20">
                <PricelistStarButton productId={product.id} />
              </div>
              {product.gallery[selectedImage] ? (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className={`product-gallery-main relative block w-full aspect-[3/4] max-h-[min(75vh,720px)] cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    theme === 'dark' ? 'bg-dark-800' : 'bg-white'
                  }`}
                  aria-label={t('product.viewImageFullSize', { name: product.name })}
                >
                  <Image
                  src={catalogDetailImageSrc(product.gallery[selectedImage], product.source_url)}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 85vw, 45vw"
                    className="relative z-0 object-contain p-2 pointer-events-none"
                    priority
                    unoptimized={shouldUnoptimizeProductImage(product.gallery[selectedImage])}
                  />
                  {product.featured ? <ProductFeaturedTipBadge variant="gallery" /> : null}
                  <ProductImageWatermark variant="gallery" />
                </button>
              ) : (
                <div
                  className={`product-gallery-main relative flex w-full aspect-[3/4] max-h-[min(75vh,720px)] items-center justify-center text-sm ${
                    theme === 'dark' ? 'bg-dark-800 text-gray-500' : 'bg-white text-gray-400'
                  }`}
                >
                  {t('product.noImage')}
                </div>
              )}
              {product.gallery[selectedImage] && product.sold_out ? (
                <ProductRibbon kind="soldOut" variant="gallery" />
              ) : product.gallery[selectedImage] && product.pre_order ? (
                <ProductRibbon kind="preOrder" variant="gallery" />
              ) : null}
            </div>
          </div>

          {lightboxOpen && product.gallery[selectedImage] ? (
            <div
              ref={lightboxRef}
              tabIndex={-1}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 outline-none touch-none"
              role="dialog"
              aria-modal="true"
              aria-label={`${product.name} — image ${selectedImage + 1} of ${product.gallery.length}`}
              onTouchStart={handleLightboxTouchStart}
              onTouchEnd={handleLightboxTouchEnd}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/85 backdrop-blur-sm"
                aria-label={t('product.closeImage')}
                onClick={closeLightbox}
              />
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="absolute top-4 right-4 z-20 rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
                aria-label={t('product.close')}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              {product.gallery.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      goToPreviousImage()
                    }}
                    className="absolute left-2 sm:left-6 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                    aria-label={t('product.previousImage')}
                  >
                    <ChevronLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      goToNextImage()
                    }}
                    className="absolute right-2 sm:right-6 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                    aria-label={t('product.nextImage')}
                  >
                    <ChevronRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </>
              ) : null}
              <div className="relative z-10 inline-flex max-h-[92vh] max-w-[min(calc(96vw-5rem),1400px)] items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- full-resolution lightbox */}
                <img
                  key={product.gallery[selectedImage]}
                  src={catalogDetailImageSrc(product.gallery[selectedImage], product.source_url)}
                  alt={`${product.name} — image ${selectedImage + 1}`}
                  className="relative z-0 max-h-[92vh] max-w-full w-auto h-auto object-contain select-none pointer-events-none"
                  draggable={false}
                />
                <ProductImageWatermark variant="lightbox" />
              </div>
            </div>
          ) : null}

          {/* Right Column - Product Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={goBackToListing}
                className={`transition-colors shrink-0 ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-label={t('product.backToShop')}
              >
                <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <nav
                className={`flex items-center flex-wrap gap-x-2 gap-y-1 text-sm min-w-0 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
                aria-label={t('product.breadcrumb')}
              >
                <Link
                  href={toLocalizedPath('/')}
                  className={theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}
                >
                  {t('nav.home')}
                </Link>
                {product.category.trim() ? (
                  <>
                    <span className="text-gray-400" aria-hidden>
                      /
                    </span>
                    <Link
                      href={categoryHref}
                      className={theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}
                    >
                      {getTopCategoryLabel(product.category, t)}
                    </Link>
                  </>
                ) : null}
              </nav>
            </div>

            {/* Product Header */}
            <div>
              {product.version && product.version !== APP_DEFAULT_PRODUCT_VERSION ? (
                <div className="mb-2">
                  <span
                    className={`text-sm px-2 py-1 rounded ${
                      theme === 'dark'
                        ? 'text-gray-400 bg-dark-700'
                        : 'text-gray-600 bg-gray-200'
                    }`}
                  >
                    v{product.version}
                  </span>
                </div>
              ) : null}

              <h1 className={`text-3xl font-bold mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {product.name}
              </h1>
              
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <StarIconSolid
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating) 
                          ? 'text-yellow-400' 
                          : theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{product.rating}</span>
                </div>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  {t('product.reviewsCount', { count: product.reviewCount })}
                </span>
                {!catalogMode && (
                  <>
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>•</span>
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      {t('product.downloads', { count: product.downloads })}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Price and options — between reviews and description */}
            <div className={`rounded-lg p-6 border ${
              theme === 'dark' 
                ? 'bg-dark-800 border-dark-700' 
                : 'bg-white border-gray-200 shadow-lg'
            }`}>
              <div className={shopProductHasOptions(product.productOptions) ? 'mb-5' : undefined}>
                {shopProductHasOptions(product.productOptions) ? (
                  <ProductOptionPrice
                    price={displayPrices.price}
                    originalPrice={displayPrices.original_price}
                    productId={product.id}
                    size="page"
                  />
                ) : isZeroPrice(selectedLicenseOption?.price ?? product.price) ? (
                  <ProductOptionPrice
                    price={0}
                    originalPrice={product.original_price}
                    productId={product.id}
                    size="page"
                  />
                ) : (
                  <ProductOptionPrice
                    price={selectedLicenseOption?.price ?? product.price}
                    originalPrice={product.original_price}
                    productId={product.id}
                    size="page"
                  />
                )}
              </div>

              {shopProductOptions ? (
                isSingleFixedProductOption(product.productOptions) ? (
                  <ProductFixedOptionDisplay
                    groups={shopProductOptions}
                    variant="page"
                  />
                ) : (
                  <ProductOptionSelector
                    groups={shopProductOptions}
                    selected={selectedOptions}
                    onChange={(groupName, valueLabel) => {
                      setSelectedOptions((prev) => ({ ...prev, [groupName]: valueLabel }))
                      setVariantError(null)
                    }}
                    onClear={(groupName) => {
                      setSelectedOptions((prev) => {
                        const next = { ...prev }
                        delete next[groupName]
                        return next
                      })
                    }}
                    variant="page"
                  />
                )
              ) : null}
            </div>

            {product.shortDescription ? (
              <div
                className={`rounded-lg p-4 border ${
                  theme === 'dark'
                    ? 'bg-dark-800 border-dark-700'
                    : 'bg-white border-gray-200 shadow-lg'
                }`}
              >
                <p
                  className={`leading-relaxed whitespace-pre-line ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}
                >
                  {product.shortDescription}
                </p>
              </div>
            ) : null}

            {!catalogMode && (
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-lg p-4 border ${
                theme === 'dark'
                  ? 'bg-dark-800 border-dark-700'
                  : 'bg-white border-gray-200 shadow-lg'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <TruckIcon className="w-5 h-5 text-primary-500" />
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{t('product.instantDownload')}</span>
                </div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>{t('product.instantDownload.subtitle')}</p>
              </div>

              <div className={`rounded-lg p-4 border ${
                theme === 'dark'
                  ? 'bg-dark-800 border-dark-700'
                  : 'bg-white border-gray-200 shadow-lg'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <ShieldCheckIcon className="w-5 h-5 text-primary-500" />
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{t('product.securePayment')}</span>
                </div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>{t('product.securePayment.subtitle')}</p>
              </div>
            </div>
            )}

            {/* Product Meta */}
            <div className={`rounded-lg p-4 border ${
              theme === 'dark' 
                ? 'bg-dark-800 border-dark-700' 
                : 'bg-white border-gray-200 shadow-lg'
            }`}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{t('product.meta.sku')}</span>
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{product.sku}</span>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{t('product.meta.version')}</span>
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{product.version}</span>
                </div>
              </div>
            </div>

            {/* Size, license, and cart */}
            {!catalogMode && (
            <div className={`rounded-lg p-6 border ${
              theme === 'dark' 
                ? 'bg-dark-800 border-dark-700' 
                : 'bg-white border-gray-200 shadow-lg'
            }`}>
                  {product.availableSizes.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <label className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Size:</label>
                      <div className="flex flex-wrap gap-2">
                        {product.availableSizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setSelectedSize(size)
                              setVariantError(null)
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                              selectedSize === size
                                ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                                : theme === 'dark'
                                  ? 'border-dark-600 text-gray-300 hover:border-primary-500'
                                  : 'border-gray-300 text-gray-700 hover:border-primary-500'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.availableColors.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <label className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Color:</label>
                      <div className="flex flex-wrap gap-2">
                        {product.availableColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              setSelectedColor(color)
                              setVariantError(null)
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                              selectedColor === color
                                ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                                : theme === 'dark'
                                  ? 'border-dark-600 text-gray-300 hover:border-primary-500'
                                  : 'border-gray-300 text-gray-700 hover:border-primary-500'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {variantError && (
                    <p className="text-red-400 text-sm mb-4">{variantError}</p>
                  )}

                  {licenseOptions.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    <label className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>{t('product.licenseType')}</label>
                    {licenseOptions.map((option) => (
                      <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="license"
                          value={option.id}
                          checked={selectedLicense === option.id}
                          onChange={(e) => setSelectedLicense(e.target.value)}
                          className="text-primary-500 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{option.name}</span>
                            <span className="text-primary-500 font-bold">
                              {formatPrice(option.price)}
                            </span>
                          </div>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  ) : null}

                  <div className="space-y-4">
                    {inCart ? (
                      <div className="text-center">
                        <div className="text-green-400 mb-2">{t('product.addedToCart')}</div>
                        <div className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {t('product.quantityInCart', { count: quantityInCart })}
                        </div>
                        <Link
                          href={appPath('/cart')}
                          className="btn-primary w-full mt-3"
                        >
                          {t('product.viewCart')}
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-3">
                          <label className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>{t('product.quantity')}</label>
                          <div className={`flex items-center border rounded-lg ${
                            theme === 'dark' ? 'border-dark-600' : 'border-gray-300'
                          }`}>
                            <button
                              type="button"
                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                              className={`px-3 py-2 transition-colors ${
                                theme === 'dark'
                                  ? 'text-gray-400 hover:text-white'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              -
                            </button>
                            <span className={`px-3 py-2 min-w-[3rem] text-center ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(quantity + 1)}
                              className={`px-3 py-2 transition-colors ${
                                theme === 'dark'
                                  ? 'text-gray-400 hover:text-white'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddToCart}
                          disabled={isAdding}
                          className="btn-primary w-full py-3 text-lg font-medium"
                        >
                          {isAdding ? t('product.addingToCart') : t('product.addToCart')}
                        </button>
                      </>
                    )}
                  </div>
            </div>
            )}

            {product.category ||
            product.brands.length > 0 ||
            (product.tags?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {product.category ? (
                  <Link
                    href={categoryHref}
                    className={`inline-block text-sm px-2 py-1 rounded uppercase tracking-wide transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-300 bg-dark-700 hover:bg-dark-600'
                        : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {getTopCategoryLabel(product.category, t)}
                  </Link>
                ) : null}
                {brandLinks.map((brandItem) => (
                  <Link
                    key={brandItem.name}
                    href={brandItem.href}
                    className={`inline-block text-sm px-2 py-1 rounded uppercase tracking-wide transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-300 bg-dark-700 hover:bg-dark-600'
                        : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {brandItem.name}
                  </Link>
                ))}
                {(product.tags ?? []).map((tag) => (
                  <Link
                    key={tag}
                    href={`${toLocalizedPath('/')}?tag=${encodeURIComponent(tag)}`}
                    className={`inline-block text-sm px-2 py-1 rounded uppercase tracking-wide transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-300 bg-dark-700 hover:bg-dark-600'
                        : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {getTagLabel(tag, t)}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-16">
          <h2
            className={`text-xl font-semibold mb-6 pb-3 border-b ${
              theme === 'dark' ? 'text-white border-dark-700' : 'text-gray-900 border-gray-200'
            }`}
          >
            {t('product.reviews')}
          </h2>

          {reviews.length > 0 ? (
            <div className="space-y-6 max-w-3xl">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className={`rounded-lg border p-4 ${
                    theme === 'dark'
                      ? 'border-dark-700 bg-dark-800'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {review.user_name}
                    </span>
                    <span className="text-amber-500 text-sm">
                      {'★'.repeat(Math.min(5, Math.max(0, Math.round(review.rating))))}
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
                        {'☆'.repeat(5 - Math.min(5, Math.max(0, Math.round(review.rating))))}
                      </span>
                    </span>
                  </div>
                  {review.title ? (
                    <p className={`font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                      {review.title}
                    </p>
                  ) : null}
                  {review.comment ? (
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      {review.comment}
                    </p>
                  ) : null}
                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⭐</div>
              <h3
                className={`text-2xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                {t('product.customerReviews')}
              </h3>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                {t('product.noReviewsYet')}
              </p>
            </div>
          )}
        </section>
          </div>
        </main>
      </div>
    </div>
  )
}
