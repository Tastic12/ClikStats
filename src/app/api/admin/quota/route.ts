import { NextResponse } from 'next/server'
import { createServiceAdmin, getYoutubeUsageSummary, isAdminEmail } from '../../../../../lib/admin'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createServiceAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const [today, week] = await Promise.all([
      getYoutubeUsageSummary(admin, todayStart),
      getYoutubeUsageSummary(admin, new Date(Date.now() - 7 * 86400000)),
    ])

    return NextResponse.json({
      daily_quota: 10_000,
      today,
      last_7_days: week,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
