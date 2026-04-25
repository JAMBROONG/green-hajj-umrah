import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAvatarUrl } from '@/lib/url-safety';
import { mergeAndSanitizeMetadata } from '@/lib/profile-metadata';

export const runtime = 'nodejs';

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { avatarUrl } = body;

    // Validasi SSRF: avatarUrl di-fetch oleh server saat generate sertifikat,
    // jadi URL yang menunjuk private IP / cloud metadata bisa jadi serangan.
    // validateAvatarUrl mengizinkan: data: URI, relative path, dan http(s)
    // ke host non-private. Kosong/null = hapus avatar (boleh).
    const check = validateAvatarUrl(avatarUrl);
    if (!check.ok) {
      return NextResponse.json(
        { error: check.reason || 'avatarUrl tidak valid' },
        { status: 400 },
      );
    }

    const user = await prisma.profiles.findUnique({
      where: { id: session.user.id },
      select: { metadata: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Sanitize merge: drop key tidak ada di allowlist + validate avatar_url.
    // Walaupun sudah di-validate via validateAvatarUrl di atas, fungsi ini
    // juga membersihkan key legacy yang mungkin tercemar sebelum patch.
    const newMetadata = mergeAndSanitizeMetadata(user.metadata, {
      avatar_url: avatarUrl ?? null,
    });

    await prisma.profiles.update({
      where: { id: session.user.id },
      data: {
        metadata: newMetadata,
      },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: avatarUrl ?? null,
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    return NextResponse.json(
      { error: 'Failed to update avatar' },
      { status: 500 }
    );
  }
}
