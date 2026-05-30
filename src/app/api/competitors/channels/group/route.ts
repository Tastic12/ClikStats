import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const channelId = body.channel_id as string | undefined
    const groupId = (body.group_id as string | null | undefined) ?? null

    if (!channelId?.trim()) {
      return NextResponse.json({ error: 'channel_id is required' }, { status: 400 })
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

    if (groupId) {
      const { data: group, error: groupError } = await admin
        .from('competitor_channel_groups')
        .select('id')
        .eq('id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (groupError || !group) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
    }

    const { data: updated, error } = await admin
      .from('competitor_channels')
      .update({ group_id: groupId })
      .eq('id', channelId)
      .eq('user_id', user.id)
      .select('id, group_id, channel_name')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }
    if (!updated) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, channel: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
