import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const imagePath = path.join('/')

  const prefix = (process.env.NEXT_PUBLIC_IMAGE_URL_PREFIX || 'http://localhost:3000').replace(/\/$/, '')
  const imageUrl = `${prefix}/${imagePath}`

  try {
    const upstream = await fetch(imageUrl, {
      next: { revalidate: 86400 },
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Image not found' }, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const buffer = await upstream.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
  }
}
