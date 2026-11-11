import { formatMoney } from '../../lib/supabase'
import { salesText, soldCount } from '../../lib/sales'

/**
 * Davomat jadvalidagi «Sotdi» katakchasi.
 * report — shu kunning sotuv hisoboti; expected — xodimga sotuv yoqilgan (tasdiqlanmagan bo'lsa ko'rsatamiz).
 */
export default function SalesCell({ report, expected, open }) {
  if (!report) {
    if (!expected) return <span className="text-slate-300">—</span>
    return <span className="text-xs text-amber-700">{open ? 'hali yozmagan' : 'tasdiqlanmagan'}</span>
  }
  return (
    <div className="min-w-0 max-w-[220px]">
      <p className="text-sm font-medium text-slate-900">
        {report.mode === 'percent' ? salesText(report) : `${soldCount(report)} ta`}
      </p>
      {report.mode !== 'percent' && (
        <p className="text-xs text-slate-500 truncate" title={salesText(report)}>{salesText(report)}</p>
      )}
      <p className="text-xs text-green-700 font-medium">+{formatMoney(report.bonus_amount)}</p>
    </div>
  )
}
