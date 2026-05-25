import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { embedImageFromBuffer, embeddingToPgvectorText } from '../../../../../lib/embeddings'

export const maxDuration = 60

const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB — covers any sensible thumbnail upload

export async function POST(request: Request) {
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

    const form = await request.formData()
    const file = form.get('image')
    const matchCountRaw = Number(form.get('match_count'))
    const matchCount = Math.min(Math.max(matchCountRaw || 24, 4), 60)

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Image upload (field name "image") is required.' },
        { status: 400 }
      )
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Uploaded file is not an image.' }, { status: 400 })
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `Image is too large (max ${MAX_IMAGE_BYTES / 1024 / 1024} MB).` },
        { status: 400 }
      )
    }

    const buffer = await file.arrayBuffer()
    const vec = await embedImageFromBuffer(buffer, file.type)

    const { data, error } = await admin.rpc('search_thumbnails', {
      user_uuid: user.id,
      query_embedding: embeddingToPgvectorText(vec),
      match_count: matchCount,
    })

    if (error) {
      return NextResponse.json({ error: `Search failed: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, results: data || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
