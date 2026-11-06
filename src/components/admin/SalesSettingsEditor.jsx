import { LuPlus, LuTrash2, LuShoppingBag } from 'react-icons/lu'
import { formatMoney } from '../../lib/supabase'

/**
 * Xodim tahrirlash oynasidagi «Sotuv bonusi» bo'limi (boshqariladigan komponent).
 * value: { mode: '' | 'per_item' | 'percent', percent: '5', products: [{ id?, name, unit_pay }] }
 */
export default function SalesSettingsEditor({ value, onChange, missing }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const setProduct = (i, patch) => set({ products: value.products.map((p, j) => (j === i ? { ...p, ...patch } : p)) })
  const addProduct = () => set({ products: [...value.products, { name: '', unit_pay: '' }] })
  const removeProduct = (i) => set({ products: value.products.filter((_, j) => j !== i) })

  const choose = (mode) => {
    // «Har donasiga» tanlanganda darhol bitta bo'sh mahsulot qatori — nima sotishini so'raymiz
    if (mode === 'per_item' && value.products.length === 0) {
      onChange({ ...value, mode, products: [{ name: '', unit_pay: '' }] })
    } else {
      set({ mode })
    }
  }

  if (missing) {
    return <p className="text-xs text-amber-700">Sotuv bonusi uchun Supabase'da 025_sales.sql ni ishga tushiring.</p>
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label flex items-center gap-1.5"><LuShoppingBag size={14} /> Sotuv bonusi</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['', "Yo'q", 'Faqat maosh'],
            ['per_item', 'Donasiga', 'Har sotilgan donaga summa'],
            ['percent', 'Foizdan', 'Sotuv summasidan %'],
          ].map(([v, t, d]) => (
            <button key={v || 'none'} type="button" onClick={() => choose(v)}
              className={`text-left rounded-lg border px-3 py-2.5 cursor-pointer ${value.mode === v ? 'border-emerald-600 bg-emerald-50' : 'border-slate-300 hover:border-slate-400'}`}>
              <p className="text-sm font-medium text-slate-900">{t}</p>
              <p className="text-xs text-slate-500">{d}</p>
            </button>
          ))}
        </div>
      </div>

      {value.mode === 'per_item' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Xodim nima sotadi va har donasi uchun qancha oladi?</p>
          {value.products.map((p, i) => (
            <div key={p.id || `new-${i}`} className="flex items-center gap-2">
              <input
                value={p.name}
                onChange={e => setProduct(i, { name: e.target.value })}
                className="input-field flex-1"
                placeholder="Mahsulot, masalan: Kofe"
              />
              <div className="relative w-36">
                <input
                  type="number" min="0" inputMode="numeric"
                  value={p.unit_pay}
                  onChange={e => setProduct(i, { unit_pay: e.target.value })}
                  className="input-field pr-12"
                  placeholder="2000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">so'm</span>
              </div>
              <button type="button" onClick={() => removeProduct(i)} className="p-2 text-slate-400 hover:text-red-600 cursor-pointer" aria-label="O'chirish">
                <LuTrash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addProduct} className="btn-secondary w-full">
            <LuPlus size={16} /> Mahsulot qo'shish
          </button>
          {value.products.some(p => p.name && Number(p.unit_pay) > 0) && (
            <p className="text-xs text-slate-500">
              Masalan: {value.products.find(p => p.name && Number(p.unit_pay) > 0).name} 10 ta sotsa →{' '}
              <b className="text-slate-900">{formatMoney(10 * Number(value.products.find(p => p.name && Number(p.unit_pay) > 0).unit_pay))}</b> bonus
            </p>
          )}
        </div>
      )}

      {value.mode === 'percent' && (
        <div className="space-y-1.5">
          <label className="label">Sotuv summasidan necha foiz?</label>
          <div className="relative w-40">
            <input
              type="number" min="0" max="100" step="0.1" inputMode="decimal"
              value={value.percent}
              onChange={e => set({ percent: e.target.value })}
              className="input-field pr-8"
              placeholder="5"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
          </div>
          {Number(value.percent) > 0 && (
            <p className="text-xs text-slate-500">
              Masalan: kuniga 1 000 000 so'mlik sotsa → <b className="text-slate-900">{formatMoney(Math.round(1000000 * Number(value.percent) / 100))}</b> bonus
            </p>
          )}
        </div>
      )}

      {value.mode && (
        <p className="text-xs text-slate-500">
          Xodim har kuni ishdan ketishdan oldin ilovada bugun nima sotganini yozib tasdiqlaydi — tasdiqlamasa ketishni belgilay olmaydi.
          Bonus asosiy maoshning ustiga qo'shiladi.
        </p>
      )}
    </div>
  )
}
