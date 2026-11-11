import { supabase } from './supabase'

// ─── Sotuv bonusi (025_sales.sql) ─────────────────────────────────────────────
// employees.sales_mode: null — sotuv yo'q | 'per_item' — donasiga summa | 'percent' — foiz

export const SALES_MODES = {
  per_item: 'Har donasiga summa',
  percent:  'Sotuv summasidan foiz',
}

export const EMPTY_SALES = { mode: '', percent: '', products: [] }

// 025 hali ishga tushirilmagan bo'lsa — tushunarli xabar
export const salesMissing = (error) => {
  const m = error?.message || ''
  return error?.code === 'PGRST202' || error?.code === 'PGRST205' || error?.code === '42P01' ||
    m.includes('sales_') || m.includes('Could not find')
}
export const SALES_SQL_HINT = "Supabase'da 025_sales.sql hali ishga tushirilmagan"

const dayKey = (d) => (typeof d === 'string' ? d.slice(0, 10) : d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }))

// Tahrirlash oynasi uchun: xodimning sozlamasi va mahsulotlari
export async function loadSalesSettings(employee) {
  if (!employee?.id) return { ...EMPTY_SALES }
  const { data, error } = await supabase
    .from('sales_products')
    .select('id, name, unit_pay, sort, is_active')
    .eq('employee_id', employee.id)
    .eq('is_active', true)
    .order('sort').order('name')
  if (error) {
    if (salesMissing(error)) return { ...EMPTY_SALES, missing: true }
    throw error
  }
  return {
    mode: employee.sales_mode || '',
    percent: employee.sales_percent ? String(Number(employee.sales_percent)) : '',
    products: (data || []).map(p => ({ id: p.id, name: p.name, unit_pay: String(Number(p.unit_pay) || '') })),
  }
}

// Saqlash: rejim, foiz va mahsulotlar ro'yxati
export async function saveSalesSettings(employeeId, value) {
  const mode = value.mode || null
  const products = (value.products || []).filter(p => p.name?.trim())

  if (mode === 'per_item' && products.length === 0) {
    throw new Error("Sotuv: kamida bitta mahsulot yozing (nima sotadi va donasiga qancha)")
  }
  if (mode === 'percent' && !(Number(value.percent) > 0 && Number(value.percent) <= 100)) {
    throw new Error("Sotuv: foizni 0 dan 100 gacha yozing (masalan 5)")
  }

  const { error } = await supabase
    .from('employees')
    .update({ sales_mode: mode, sales_percent: mode === 'percent' ? Number(value.percent) : 0 })
    .eq('id', employeeId)
  if (error) throw salesMissing(error) ? new Error(SALES_SQL_HINT) : error

  if (mode !== 'per_item') return

  // Olib tashlanganlar — o'chirilmaydi, faqat yashiriladi (eski hisobotlarda nomi qoladi)
  const { data: existing, error: e1 } = await supabase
    .from('sales_products').select('id').eq('employee_id', employeeId).eq('is_active', true)
  if (e1) throw e1
  const keep = new Set(products.filter(p => p.id).map(p => p.id))
  const removed = (existing || []).filter(p => !keep.has(p.id)).map(p => p.id)
  if (removed.length) {
    const { error } = await supabase.from('sales_products').update({ is_active: false }).in('id', removed)
    if (error) throw error
  }

  for (const [i, p] of products.entries()) {
    const row = { name: p.name.trim(), unit_pay: Number(p.unit_pay) || 0, sort: i }
    const { error } = p.id
      ? await supabase.from('sales_products').update(row).eq('id', p.id)
      : await supabase.from('sales_products').insert({ ...row, employee_id: employeeId })
    if (error) throw error
  }
}

// Davr ichidagi hisobotlar (from/to — 'YYYY-MM-DD' yoki ISO)
export async function getSalesReports(employeeId, from, to) {
  let q = supabase.from('sales_reports').select('*').gte('day', dayKey(from)).lte('day', dayKey(to)).order('day')
  if (employeeId) q = q.eq('employee_id', employeeId)
  const { data, error } = await q
  if (error) {
    if (salesMissing(error)) return []
    throw error
  }
  return data || []
}

// Davr bo'yicha jami sotuv bonusi
export async function getSalesBonus(employeeId, from, to) {
  const rows = await getSalesReports(employeeId, from, to)
  return rows.reduce((s, r) => s + (Number(r.bonus_amount) || 0), 0)
}

// Admin hisobotni tuzatadi (bonus serverda qayta hisoblanadi)
export async function adminSaveSalesReport(employeeId, day, { items = [], salesTotal = 0, note = null }) {
  const { data, error } = await supabase.rpc('admin_save_sales_report', {
    p_employee_id: employeeId, p_day: day, p_items: items, p_sales_total: Number(salesTotal) || 0, p_note: note,
  })
  if (error) {
    if (error.message?.includes('SALES_DISABLED')) throw new Error("Bu xodimga sotuv o'chirilgan — avval xodimni tahrirlab sotuvni yoqing")
    throw salesMissing(error) ? new Error(SALES_SQL_HINT) : error
  }
  return data
}

export const salesLabel = (emp) => {
  if (emp?.sales_mode === 'percent') return `Sotuvdan ${Number(emp.sales_percent)}%`
  if (emp?.sales_mode === 'per_item') return 'Sotuv: donasiga'
  return null
}

// Hisobot kalitlari: "xodimId|2026-11-11" → hisobot
export const salesKey = (employeeId, day) => `${employeeId}|${day}`
export const indexSalesReports = (rows) => Object.fromEntries((rows || []).map(r => [salesKey(r.employee_id, r.day), r]))
export const sessionDay = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' })

// Necha dona sotgani (donasiga turida)
export const soldCount = (r) => (r?.items || []).reduce((t, i) => t + (Number(i.qty) || 0), 0)

// Qisqa matn: "Kofe 12 ta, Choy 5 ta" yoki "2 500 000 so'mlik"
export function salesText(r) {
  if (!r) return ''
  if (r.mode === 'percent') return `${Number(r.sales_total).toLocaleString('ru-RU').replace(/ |,/g, ' ')} so'mlik`
  return (r.items || []).map(i => `${i.name} ${i.qty} ta`).join(', ') || "Hech narsa sotmagan"
}
