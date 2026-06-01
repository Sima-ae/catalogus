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
}

export default function PricelistStarButton({ productId, className = '', size = 'md' }: Props) {
  const router = useRouter()
  const { onList, busy, canUse, toggle } = usePricelistMembership(productId)

  if (!canUse) return null

  const iconClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const result = await toggle()
    if (result.needsLogin) {
      router.push(appPath('/login'))
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`rounded-full p-1.5 bg-black/50 hover:bg-black/70 text-white transition-colors disabled:opacity-50 ${className}`}
      aria-label={onList ? 'Remove from pricelist' : 'Add to pricelist'}
      title={onList ? 'On pricelist' : 'Add to pricelist'}
    >
      {onList ? (
        <StarIconSolid className={iconClass} />
      ) : (
        <StarIcon className={iconClass} />
      )}
    </button>
  )
}
