import { cn } from '@/lib/utils'

/**
 * Logo BusinessWeb — kolorowe w trybie jasnym, białe w ciemnym (przełączane przez CSS `.dark`).
 * Sterowanie rozmiarem przez `className` (np. `h-7 w-auto`).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bw-logo.png"
        alt="BusinessWeb Project Manager"
        className={cn('block dark:hidden w-auto', className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bw-logo-white.png"
        alt=""
        aria-hidden="true"
        className={cn('hidden dark:block w-auto', className)}
      />
    </>
  )
}
