import { useId } from 'react'

// COFFEEGRAM brend logotipi — /public/brand/coffeegram-logo.png (shaffof fonli qora belgi).
// Rang: currentColor (atrofdagi matn rangini oladi): text-[#111111], text-white ...
// Interfeys ranglari o'zgarmagan.

export const BRAND_YELLOW = '#FCA914'
export const BRAND_INK = '#111111'

const SRC = '/brand/coffeegram-logo.png'
const W = 425
const H = 444

// Belgi rasmini niqob qilib, ustidan currentColor bilan bo'yaymiz
function Emblem({ maskId }) {
  return (
    <>
      <defs>
        <mask id={maskId} style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <image href={SRC} x="0" y="0" width={W} height={H} />
        </mask>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="currentColor" mask={`url(#${maskId})`} />
    </>
  )
}

/**
 * To'liq logotip: belgi + ostida "COFFEEGRAM" yozuvi.
 * tagline={false} — faqat belgi.
 */
export function CoffeegramLogo({ tagline = true, className = '', title = 'Coffeegram' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      viewBox={tagline ? `0 0 ${W} 518` : `0 0 ${W} ${H}`}
      fill="currentColor"
      role="img"
      aria-label={title}
      className={className}
    >
      <Emblem maskId={`cg-${id}`} />
      {tagline && (
        <text
          x={W / 2} y="510" textAnchor="middle" textLength="236" lengthAdjust="spacingAndGlyphs"
          fontFamily="Montserrat, 'Helvetica Neue', Arial, sans-serif" fontSize="31" fontWeight="500"
        >
          COFFEEGRAM
        </text>
      )}
    </svg>
  )
}

// Eski nom bilan ham ishlaydi
export const FrittoLogo = CoffeegramLogo

// Kichik belgi (menyu, sarlavha)
export function LogoMark({ size = 32, className = '' }) {
  return (
    <span className={`flex-shrink-0 inline-flex text-[#111111] ${className}`} style={{ width: size, height: size }}>
      <CoffeegramLogo tagline={false} className="w-full h-full" />
    </span>
  )
}

// Menyu uchun: belgi + "Coffeegram" yozuvi + ostida kichik izoh (masalan "Admin panel")
export default function Logo({ size = 32, subtitle }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <LogoMark size={size} />
      <div className="min-w-0 leading-none">
        <p className="text-[15px] font-semibold tracking-[0.12em] text-[#111111]">COFFEEGRAM</p>
        {subtitle && <p className="text-xs text-slate-500 truncate mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
