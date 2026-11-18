import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

const MARKETING_TABLES = new Set([
  'blog_posts',
  'social_posts',
  'social_post_captions',
  'edm_campaigns',
  'edm_events',
  'leads',
])

function createMarketingFallbackQuery(rawClient: any, table: string) {
  const op: any = {
    table,
    action: 'select',
    filters: [],
    orders: [],
  }

  let realBuilder: any = rawClient.from(table)

  const runWithFallback = async () => {
    try {
      const res = await realBuilder
      if (
        res?.error &&
        (String(res.error.message || '').includes('schema cache') ||
          String(res.error.code || '') === 'PGRST205' ||
          String(res.error.code || '') === '42P01')
      ) {
        const fbRes = await fetch('/api/admin/marketing-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op),
        })
        return await fbRes.json()
      }
      return res
    } catch {
      const fbRes = await fetch('/api/admin/marketing-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(op),
      })
      return await fbRes.json()
    }
  }

  const proxy: any = {
    select(columns = '*', opts?: { count?: string; head?: boolean }) {
      if (op.action === 'select') {
        op.selectColumns = columns
        if (opts?.count === 'exact') op.countExact = true
        if (opts?.head) op.headOnly = true
      }
      realBuilder = realBuilder.select(columns, opts)
      return proxy
    },
    insert(values: any) {
      op.action = 'insert'
      op.values = values
      realBuilder = realBuilder.insert(values)
      return proxy
    },
    upsert(values: any, opts?: { onConflict?: string }) {
      op.action = 'upsert'
      op.values = values
      if (opts?.onConflict) op.onConflict = opts.onConflict
      realBuilder = realBuilder.upsert(values, opts)
      return proxy
    },
    update(values: any) {
      op.action = 'update'
      op.values = values
      realBuilder = realBuilder.update(values)
      return proxy
    },
    delete() {
      op.action = 'delete'
      realBuilder = realBuilder.delete()
      return proxy
    },
    eq(column: string, value: any) {
      op.filters.push({ type: 'eq', column, value })
      realBuilder = realBuilder.eq(column, value)
      return proxy
    },
    neq(column: string, value: any) {
      op.filters.push({ type: 'neq', column, value })
      realBuilder = realBuilder.neq(column, value)
      return proxy
    },
    in(column: string, values: any[]) {
      op.filters.push({ type: 'in', column, value: values })
      realBuilder = realBuilder.in(column, values)
      return proxy
    },
    not(column: string, operator: string, value: any) {
      if (operator === 'is' && value === null) {
        op.filters.push({ type: 'not_is_null', column })
      }
      realBuilder = realBuilder.not(column, operator, value)
      return proxy
    },
    lt(column: string, value: any) {
      op.filters.push({ type: 'lt', column, value })
      realBuilder = realBuilder.lt(column, value)
      return proxy
    },
    or(expr: string) {
      op.filters.push({ type: 'or', orExpr: expr })
      realBuilder = realBuilder.or(expr)
      return proxy
    },
    order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
      op.orders.push({ column, ascending: opts?.ascending !== false })
      realBuilder = realBuilder.order(column, opts)
      return proxy
    },
    limit(count: number) {
      op.limit = count
      realBuilder = realBuilder.limit(count)
      return proxy
    },
    single() {
      op.single = true
      realBuilder = realBuilder.single()
      return proxy
    },
    maybeSingle() {
      op.maybeSingle = true
      realBuilder = realBuilder.maybeSingle()
      return proxy
    },
    then(onfulfilled?: any, onrejected?: any) {
      return runWithFallback().then(onfulfilled, onrejected)
    },
  }

  return proxy
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase environment variables are missing. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file and restart your development server.'
    )
  }

  const rawClient = createBrowserClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
    },
  })

  const origFrom = rawClient.from.bind(rawClient)
  ;(rawClient as any).from = (table: string) => {
    if (MARKETING_TABLES.has(table)) {
      return createMarketingFallbackQuery({ from: origFrom }, table)
    }
    return origFrom(table as any)
  }

  return rawClient
}
