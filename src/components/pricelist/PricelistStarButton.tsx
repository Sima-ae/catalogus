'use client'

import { useRouter } from 'next/navigation'
import { StarIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { usePricelistMembership } from '@/lib/use-pricelist-membership'
import { appPath } from '@/lib/paths'

type Props = {
  productId: string
  className?: string
  size?: 'sm' | 'md'
  /** `overlay` on product cards; `inline` in pricelist table rows. */
  variant?: 'overlay' | 'inline'
  ownerQuery?: string
  assumedOnList?: boolean
  onListChange?: (onList: boolean) => void
}

export default function PricelistStarButton({
  productId,
  className = '',
  size = 'md',
  variant = 'overlay',
  ownerQuery,
  assumedOnList,
  onListChange,
}: Props) {
  const router = useRouter()
  const { onList, busy, canUse, toggle } = usePricelistMembership(productId, {
    ownerQuery,
    assumedOnList,
  })

  if (!canUse) return null

  const iconClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const result = await toggle()
    if (result.needsLogin) {
      router.push(appPath('/login'))
      return
    }
    if (result.ok) {
      onListChange?.(!onList)
    }
  }

  const baseClass =
    variant === 'inline'
      ? onList
        ? 'rounded-md p-1 text-white bg-black hover:bg-black transition-colors disabled:opacity-50'
        : 'rounded-md p-1 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50'
      : onList
        ? 'rounded-full p-1.5 bg-black hover:bg-black text-white transition-colors disabled:opacity-50'
        : 'rounded-full p-1.5 bg-black/50 hover:bg-black/70 text-white transition-colors disabled:opacity-50'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`${baseClass} ${className}`}
      aria-label={onList ? 'Remove from pricelist' : 'Add to pricelist'}
      title={onList ? 'Remove from pricelist' : 'Add to pricelist'}
    >
      {onList ? (
        <StarIconSolid className={iconClass} />
      ) : (
        <StarIcon className={iconClass} />
      )}
    </button>
  )
}
