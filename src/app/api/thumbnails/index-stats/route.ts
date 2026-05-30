import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export type ThumbnailIndexStatRow = {
  source: 'own' | 'competitor' | 'discovered'
  total: number
  indexed: number
  pending: number
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await admin.rpc('thumbnail_index_stats', { user_uuid: user.id })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data || []) as ThumbnailIndexStatRow[]
    const totals = rows.reduce(
      (acc, row) => ({
        total: acc.total + Number(row.total),
        indexed: acc.indexed + Number(row.indexed),
        pending: acc.pending + Number(row.pending),
      }),
      { total: 0, indexed: 0, pending: 0 }
    )

    return NextResponse.json({ bySource: rows, totals })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
