import { NextRequest } from 'next/server';

export interface AuthResult {
  userId: string;
  email: string;
}

const DEMO_USER: AuthResult = {
  userId: 'demo-user-001',
  email: 'demo@learnflow.kr',
};

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function requireAuth(
  request: NextRequest
): Promise<AuthResult | Response> {
  // Demo mode: Supabase 미설정 시 인증 바이패스
  if (!isSupabaseConfigured()) {
    return DEMO_USER;
  }

  const authHeader = request.headers.get('authorization');

  // Supabase가 설정된 정상 모드에서는 토큰이 없으면 인증 거부(401).
  // 로그인된 클라이언트는 apiFetch가 항상 Bearer 토큰을 첨부한다.
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  const { getSupabase } = await import('@/lib/supabase');
  const supabase = getSupabase();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return Response.json(
      { error: '유효하지 않은 인증 토큰입니다.' },
      { status: 401 }
    );
  }

  return {
    userId: user.id,
    email: user.email || '',
  };
}

export function isAuthError(result: AuthResult | Response): result is Response {
  return result instanceof Response;
}

export type Role = 'owner' | 'staff' | 'admin';

export interface Membership {
  userId: string;
  email: string;
  academyId: string | null;
  role: Role;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 대기중 초대 자동수락 — 초대된 이메일로 로그인하면 학원 멤버(staff)로 연결한다.
async function claimPendingInvite(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  email: string
): Promise<{ academy_id: string; role: Role } | null> {
  const { data: inv } = await supabase
    .from('invitations')
    .select('id, academy_id, role')
    .eq('status', 'pending')
    .ilike('email', email)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!inv) return null;

  await supabase
    .from('users')
    .update({ academy_id: inv.academy_id, role: inv.role })
    .eq('id', userId);
  await supabase
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', inv.id);

  return { academy_id: inv.academy_id, role: inv.role };
}

/**
 * 로그인 사용자의 학원 소속/역할을 해석한다.
 * - users 행을 보장하고, 소속이 없으면 ① 대기중 초대 자동수락 ② 소유 학원 백필 순으로 연결.
 * - 데모/미로그인(uuid 아님)은 academyId=null 로 통과시킨다(기존 동작 유지).
 */
export async function getMembership(
  request: NextRequest
): Promise<Membership | Response> {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  // 데모 유저(uuid 아님)는 DB 소속 없이 통과
  if (!UUID_RE.test(auth.userId)) {
    return { userId: auth.userId, email: auth.email, academyId: null, role: 'owner' };
  }

  const { getServiceClient } = await import('@/lib/supabase');
  const supabase = getServiceClient();

  let { data: u } = await supabase
    .from('users')
    .select('academy_id, role')
    .eq('id', auth.userId)
    .maybeSingle();

  // users 행이 없으면 생성(초대 수락/온보딩 전 단계)
  if (!u) {
    await supabase.from('users').upsert(
      {
        id: auth.userId,
        email: auth.email,
        name: auth.email.split('@')[0] || '사용자',
        role: 'owner',
      },
      { onConflict: 'id' }
    );
    u = { academy_id: null, role: 'owner' };
  }

  // 소속이 없으면 대기중 초대 자동수락
  if (!u.academy_id) {
    const claimed = await claimPendingInvite(supabase, auth.userId, auth.email);
    if (claimed) u = { academy_id: claimed.academy_id, role: claimed.role };
  }

  // 그래도 없으면, 소유 학원이 있는 레거시 원장 백필
  if (!u.academy_id) {
    const { data: owned } = await supabase
      .from('academies')
      .select('id')
      .eq('owner_id', auth.userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (owned) {
      await supabase
        .from('users')
        .update({ academy_id: owned.id, role: 'owner' })
        .eq('id', auth.userId);
      u = { academy_id: owned.id, role: 'owner' };
    }
  }

  return {
    userId: auth.userId,
    email: auth.email,
    academyId: u.academy_id ?? null,
    role: (u.role as Role) ?? 'owner',
  };
}

/**
 * 학원 멤버(원장/선생님) 권한 검증 — academyId 소속이거나 마스터(admin)여야 한다.
 * 상담/예약/과목/시간표 등 일상 업무 라우트에서 사용.
 */
export async function requireMember(
  request: NextRequest,
  academyId: string
): Promise<Membership | Response> {
  const m = await getMembership(request);
  if (isAuthError(m)) return m;
  if (m.role === 'admin') return m; // 마스터는 전 학원 접근
  // 데모(academyId=null)는 기존처럼 통과시켜 데모 대시보드를 유지
  if (m.academyId === null && !UUID_RE.test(m.userId)) return m;
  if (!m.academyId || m.academyId !== academyId) {
    return Response.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  return m;
}

/**
 * 원장(owner) 전용 권한 검증 — 선생님(staff)은 차단(403).
 * 결제/구독 등 민감 라우트에서 사용. academyId 생략 시 멤버십의 소속 학원을 사용한다.
 */
export async function requireOwnerRole(
  request: NextRequest,
  academyId?: string
): Promise<Membership | Response> {
  const m = await getMembership(request);
  if (isAuthError(m)) return m;
  if (m.role === 'admin') return m; // 마스터는 전 학원 접근
  if (m.role === 'staff') {
    return Response.json({ error: '원장님만 접근할 수 있습니다.' }, { status: 403 });
  }
  // 데모 통과
  if (m.academyId === null && !UUID_RE.test(m.userId)) return m;
  if (academyId && m.academyId !== academyId) {
    return Response.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  if (!m.academyId) {
    return Response.json({ error: '학원 정보가 없습니다.' }, { status: 403 });
  }
  return m;
}

/**
 * 마스터(관리자) 권한 검증 — 로그인 + users.role='admin' 확인.
 * 런플로우 운영자 본인 계정만 전체 학원(고객사) 데이터에 접근할 수 있다.
 */
// 마스터(런플로우 운영자) 허용 이메일.
// env MASTER_EMAILS(쉼표구분)로 지정. 미설정 시 알려진 마스터 계정으로 폴백.
function getMasterEmails(): string[] {
  const raw = process.env.MASTER_EMAILS || 'chaejdi2245@gmail.com';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireMaster(
  request: NextRequest
): Promise<AuthResult | Response> {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { getServiceClient } = await import('@/lib/supabase');
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', auth.userId)
    .single();

  // 2차 안전장치: role=admin 이면서 이메일도 허용 목록에 있어야 통과(belt-and-suspenders).
  // role 컬럼이 실수로/악의적으로 admin 으로 바뀌어도 이메일이 다르면 차단된다.
  const emailAllowed = getMasterEmails().includes(auth.email.toLowerCase());
  if (!data || data.role !== 'admin' || !emailAllowed) {
    return Response.json(
      { error: '관리자 권한이 필요합니다.' },
      { status: 403 }
    );
  }
  return auth;
}
