import { useEffect, useState } from 'react'
import { LuShoppingBag, LuPencil, LuPlus, LuX, LuCircleAlert } from 'react-icons/lu'
import { supabase, formatMoney } from '../../lib/supabase'
import { adminSaveSalesReport } from '../../lib/sales'

const MONTHS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr']
const dayText = (day) => {
  const [, m, d] = day.split('-').map(Number)
  return `${d}-${MONTHS[m - 1]}`
}
export const salesSummary = (r) => r.mode === 'percent'
  ? `Sotuv: ${formatMoney(r.sales_total)} × ${Number(r.percent)}%`
  : (r.items || []).map(i => `${i.name} ${i.qty} ta`).join(', ') || "Sotuv yo'q"

/**
 * Admin: xodimning shu oydagi kunlik sotuv hisobotlari + tuzatish.
 * onChanged — saqlangandan keyin oylikni qayta hisoblash uchun.
 */
export default function SalesReportsCard({ employee, reports, year, month, onChanged }) {
  const [editing, setEditing] = useState(null) // { day, report } | { day: '', report: null }
  const total = reports.reduce((t, r) => t + (Number(r.bonus_amount) || 0), 0)

  if (!employee?.sales_mode && reports.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
          <LuShoppingBag size={15} className="text-emerald-700" /> Sotuv bonusi
        </p>
        <p className="text-sm font-semibold text-green-700 tabular-nums">+{formatMoney(total)}</p>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-slate-500">Bu oy sotuv tasdiqlanmagan</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {reports.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setEditing({ day: r.day, report: r })}
              className="w-full flex items-start justify-between gap-3 py-2.5 text-left group cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-sm text-slate-900">
                  {dayText(r.day)}
                  {r.edited_by && <span className="text-xs text-amber-700 ml-1.5">admin tuzatgan</span>}
                </p>
                <p className="text-xs text-slate-500 truncate">{salesSummary(r)}</p>
              </div>
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold whitespace-nowrap tabular-nums text-green-700">+{formatMoney(r.bonus_amount)}</span>
                <LuPencil size={14} className="text-slate-300 group-hover:text-emerald-700" />
              </span>
            </button>
          ))}
        </div>
      )}

      {employee?.sales_mode && (
        <button type="button" onClick={() => setEditing({ day: '', report: null })} className="btn-secondary w-full mt-3">
          <LuPlus size={16} /> Kun qo'shish
        </button>
      )}

      {editing && (
        <SalesReportEditor
          employee={employee}
          day={editing.day}
          report={editing.report}
          year={year}
          month={month}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChanged?.() }}
        />
      )}
    </div>
  )
}

function SalesReportEditor({ employee, day: initialDay, report, year, month, onClose, onSaved }) {
  const pad = (n) => String(n).padStart(2, '0')
  // Server xodimning hozirgi sozlamasi bo'yicha hisoblaydi
  const mode = employee.sales_mode || report?.mode
  const [day, setDay] = useState(initialDay || `${year}-${pad(month)}-01`)
  const [products, setProducts] = useState([])
  const [qty, setQty] = useState(() => Object.fromEntries((report?.items || []).map(i => [i.product_id, String(i.qty)])))
  const [total, setTotal] = useState(report?.mode === 'percent' ? String(Number(report.sales_total) || '') : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode !== 'per_item') return
    supabase.from('sales_products').select('id, name, unit_pay, is_active, sort')
      .eq('employee_id', employee.id).order('sort').order('name')
      .then(({ data }) => {
        // Faol mahsulotlar + hisobotda bor (keyin o'chirilgan) mahsulotlar
        const used = new Set((report?.items || []).map(i => i.product_id))
        setProducts((data || []).filter(p => p.is_active || used.has(p.id)))
      })
  }, [employee.id, mode, report])

  const percent = Number(employee.sales_percent) || 0
  const bonus = mode === 'percent'
    ? Math.round((Number(total) || 0) * percent / 100)
    : products.reduce((t, p) => t + (Number(qty[p.id]) || 0) * Number(p.unit_pay), 0)

  const save = async () => {
    setError('')
    if (!day) return setError('Kunni tanlang')
    setBusy(true)
    try {
      await adminSaveSalesReport(employee.id, day, mode === 'percent'
        ? { salesTotal: total }
        : { items: products.map(p => ({ product_id: p.id, qty: Number(qty[p.id]) || 0 })) })
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer-panel">
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{report ? 'Sotuvni tuzatish' : "Sotuv qo'shish"}</h2>
            <p className="text-xs text-slate-500 truncate">{employee.full_name}{report && ` · ${dayText(report.day)}`}</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-900 cursor-pointer" aria-label="Yopish">
            <LuX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto p-6 space-y-4">
            {!report && (
              <div>
                <label className="label">Kun</label>
                <input type="date" value={day} onChange={e => setDay(e.target.value)} className="input-field" />
              </div>
            )}

            {mode === 'per_item' ? (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                {products.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">Mahsulotlar yo'q — xodimni tahrirlab qo'shing.</p>}
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">donasi {formatMoney(p.unit_pay)}</p>
                    </div>
                    <input
                      type="number" min="0" inputMode="numeric"
                      value={qty[p.id] ?? ''}
                      onChange={e => setQty(q => ({ ...q, [p.id]: e.target.value }))}
                      className="input-field w-24 text-center"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <label className="label">Sotuv summasi (so'm)</label>
                <input type="number" min="0" inputMode="numeric" value={total} onChange={e => setTotal(e.target.value)} className="input-field" placeholder="2500000" />
                <p className="text-xs text-slate-500 mt-1">Bonus: {percent}%</p>
              </div>
            )}

            <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-4 py-3">
              <span className="text-sm text-slate-700">Bonus</span>
              <span className="text-lg font-bold text-emerald-700">+{formatMoney(bonus)}</span>
            </div>

            {report && (
              <p className="text-xs text-slate-500">
                Xodim {new Date(report.confirmed_at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} da tasdiqlagan.
                Tuzatsangiz — «admin tuzatgan» deb belgilanadi.
              </p>
            )}

            {error && <p className="text-sm text-red-600 flex gap-1.5"><LuCircleAlert size={16} className="flex-shrink-0 mt-0.5" /> {error}</p>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary">Bekor qilish</button>
          <button onClick={save} disabled={busy} className="btn-primary flex-1">{busy ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </div>
      </div>
    </div>
  )
}
