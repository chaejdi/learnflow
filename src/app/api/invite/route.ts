import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// 초대 링크 처리 — 공개 라우트(토큰이 비밀). 메일/SMTP 없이 가입받는다.
// GET  ?token=...           → 초대 정보(학원명, 이메일) 조회
// POST { token, name, password } → 선생님 계정 생성 + 학원 staff 로 연결

async function findPendingInvite(token: string) {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('invitations')
    .select('id, academy_id, email, role, status, academies(name)')
    .eq('token', token)
    .maybeSingle();
  return data;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return Response.json({ error: '토큰이 필요합니다.' }, { status: 400 });
  }

  const inv = await findPendingInvite(token);
  if (!inv) {
    return Response.json({ error: '유효하지 않은 초대입니다.' }, { status: 404 });
  }
  if (inv.status !== 'pending') {
    return Response.json(
      { error: '이미 사용되었거나 취소된 초대입니다.', status: inv.status },
      { status: 410 }
    );
  }

  const academyName = (inv.academies as unknown as { name?: string } | null)?.name ?? '';
  return Response.json({
    data: { email: inv.email, academy_name: academyName },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json();

    if (!token || !password) {
      return Response.json({ error: '토큰과 비밀번호가 필요합니다.' }, { status: 400 });
    }
    if (String(password).length < 6) {
      return Response.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
    }

    const inv = await findPendingInvite(token);
    if (!inv) {
      return Response.json({ error: '유효하지 않은 초대입니다.' }, { status: 404 });
    }
    if (inv.status !== 'pending') {
      return Response.json({ error: '이미 사용되었거나 취소된 초대입니다.' }, { status: 410 });
    }

    const supabase = getServiceClient();

    // 선생님 auth 계정 생성(이메일 자동 인증 → 메일 불필요)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: inv.email,
      password,
      email_confirm: true,
    });

    // 이미 가입된 이메일이면 새로 만들 수 없음 → 기존 비번으로 로그인하면 자동연결됨
    if (createErr || !created?.user) {
      const msg = createErr?.message || '';
      if (/already|registered|exists/i.test(msg)) {
        return Response.json(
          {
            error: '이미 가입된 이메일이에요. 기존 비밀번호로 로그인하면 학원에 자동 연결됩니다.',
            code: 'exists',
          },
          { status: 409 }
        );
      }
      return Response.json({ error: '계정 생성에 실패했습니다.' }, { status: 500 });
    }

    const userId = created.user.id;

    // users 행 생성 + 학원 staff 로 연결
    await supabase.from('users').upsert(
      {
        id: userId,
        email: inv.email,
        name: (name || '').trim() || inv.email.split('@')[0] || '선생님',
        academy_id: inv.academy_id,
        role: 'staff',
      },
      { onConflict: 'id' }
    );

    // 초대 수락 처리
    await supabase
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', inv.id);

    return Response.json({ data: { email: inv.email } }, { status: 201 });
  } catch (error) {
    console.error('POST invite accept error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
