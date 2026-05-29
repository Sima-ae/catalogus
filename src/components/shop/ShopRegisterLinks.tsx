'use client'

import Link from 'next/link'
import { appPath } from '@/lib/paths'

type ShopRegisterLinksProps = {
  className?: string
  buttonClassName?: string
}

/** Header CTA pair — buyer & seller registration entry points. */
export function ShopRegisterHeaderButtons({
  className = '',
  buttonClassName = 'btn-primary text-sm sm:text-base px-3 sm:px-4 py-2 hidden sm:inline-flex',
}: ShopRegisterLinksProps) {
  return (
    <div className={`flex items-center flex-wrap gap-2 ${className}`}>
      <Link
        href={appPath('/buyer')}
        className={buttonClassName}
        title="Become a Buyer"
      >
        Become a Buyer
      </Link>
      <Link
        href={appPath('/seller')}
        className={buttonClassName}
        title="Become a Seller"
      >
        Become a Seller
      </Link>
    </div>
  )
}
