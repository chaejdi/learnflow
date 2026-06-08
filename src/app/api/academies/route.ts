import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireAuth, isAuthError } from '@/lib/auth';
import type { UpdateAcademyRequest, CreateAcademyRequest } from '@/types';

// 온보딩: 로그인한 원장님 명의로 새 학원을 생성한다.
// academies.owner_id ↔ users.id 가 서로 FK(순환)라 users 행을 먼저 보장한 뒤
// 학원을 만들고, users.academy_id 를 연결한다.
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body: CreateAcademyRequest = await request.json();
    const name = body.name?.trim();
    if (!name) {
      return Response.json({ error: '학원 이름은 필수입니다.' }, { status: 400 });
    }

    // 실제 로그인(uuid) 상태에서만 학원 생성 가능
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth.userId)) {
      return Response.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const supabase = getServiceClient();

    // 한 계정당 학원 하나 — 이미 있으면 그대로 반환(중복 생성 방지)
    const { data: existing } = await supabase
      .from('academies')
      .select('*')
      .eq('owner_id', auth.userId)
      .limit(1)
      .maybeSingle();
    if (existing) return Response.json({ data: existing });

    // users 행 보장 (id = auth uid)
    await supabase
      .from('users')
      .upsert(
        {
          id: auth.userId,
          email: auth.email,
          name: body.owner_name?.trim() || auth.email.split('@')[0] || '원장님',
          role: 'owner',
        },
        { onConflict: 'id' }
      );

    const { data: academy, error } = await supabase
      .from('academies')
      .insert({
        name,
        address: body.address?.trim() || '',
        phone: body.phone?.trim() || '',
        description: body.description?.trim() || null,
        owner_id: auth.userId,
      })
      .select()
      .single();
    if (error) throw error;

    await supabase
      .from('users')
      .update({ academy_id: academy.id })
      .eq('id', auth.userId);

    return Response.json({ data: academy }, { status: 201 });
  } catch (error) {
    console.error('POST academy error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const supabase = getServiceClient();
    const academyId = request.nextUrl.searchParams.get('id');

    if (!academyId) {
      return Response.json({ error: 'id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('academies')
      .select('*')
      .eq('id', academyId)
      .single();

    if (error) throw error;

    // 본인 소유 학원만 조회 가능
    if (data.owner_id !== auth.userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error('GET academy error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body: UpdateAcademyRequest & { id: string } = await request.json();
    const { id, ...updates } = body;

    const supabase = getServiceClient();

    // 카카오 봇 ID는 한 학원에만 연결 가능 — 다른 학원이 이미 쓰면 거절
    const channelId = updates.kakao_channel_id?.trim();
    if (channelId) {
      const { data: clash } = await supabase
        .from('academies')
        .select('id')
        .eq('kakao_channel_id', channelId)
        .neq('id', id)
        .limit(1)
        .maybeSingle();
      if (clash) {
        return Response.json(
          { error: '이미 다른 학원에 연결된 카카오 봇 ID입니다.' },
          { status: 409 }
        );
      }
    }

    // 본인 소유 학원만 수정 가능 (owner_id 일치 조건을 함께 건다)
    const { data, error } = await supabase
      .from('academies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', auth.userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error('PATCH academy error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
