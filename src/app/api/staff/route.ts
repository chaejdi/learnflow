import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireOwnerRole, isAuthError } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 직원(선생님) 관리 — 원장(owner) 전용.
// GET: 소속 멤버 + 대기중 초대 목록
// POST: 이메일로 선생님 초대(pending)
// DELETE: 대기중 초대 취소(?invite_id=) 또는 멤버 내보내기(?user_id=)

export async function GET(request: NextRequest) {
  const m = await requireOwnerRole(request);
  if (isAuthError(m)) return m;
  if (!m.academyId) return Response.json({ members: [], invitations: [] });

  try {
    const supabase = getServiceClient();

    const [{ data: members }, { data: invitations }] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .eq('academy_id', m.academyId)
        .order('created_at', { ascending: true }),
      supabase
        .from('invitations')
        .select('id, email, role, status, created_at')
        .eq('academy_id', m.academyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    return Response.json({
      members: members ?? [],
      invitations: invitations ?? [],
    });
  } catch (error) {
    console.error('GET staff error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const m = await requireOwnerRole(request);
  if (isAuthError(m)) return m;
  if (!m.academyId) {
    return Response.json({ error: '학원 정보가 없습니다.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      return Response.json({ error: '올바른 이메일을 입력해 주세요.' }, { status: 400 });
    }
    if (email === m.email.toLowerCase()) {
      return Response.json({ error: '본인은 초대할 수 없습니다.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 이미 이 학원 소속이면 거절
    const { data: existingMember } = await supabase
      .from('users')
      .select('id')
      .eq('academy_id', m.academyId)
      .ilike('email', email)
      .maybeSingle();
    if (existingMember) {
      return Response.json({ error: '이미 소속된 선생님입니다.' }, { status: 409 });
    }

    // 대기중 초대가 이미 있으면 그대로 반환(중복 방지)
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id, email, role, status, created_at')
      .eq('academy_id', m.academyId)
      .eq('status', 'pending')
      .ilike('email', email)
      .maybeSingle();
    if (existingInvite) {
      return Response.json({ data: existingInvite });
    }

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        academy_id: m.academyId,
        email,
        role: 'staff',
        invited_by: m.userId,
      })
      .select('id, email, role, status, created_at')
      .single();

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST staff invite error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const m = await requireOwnerRole(request);
  if (isAuthError(m)) return m;
  if (!m.academyId) {
    return Response.json({ error: '학원 정보가 없습니다.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    const inviteId = request.nextUrl.searchParams.get('invite_id');
    const userId = request.nextUrl.searchParams.get('user_id');

    // 대기중 초대 취소
    if (inviteId) {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('id', inviteId)
        .eq('academy_id', m.academyId);
      if (error) throw error;
      return Response.json({ success: true });
    }

    // 멤버 내보내기 — 본인/원장(owner)은 제외, 선생님(staff)만
    if (userId) {
      if (userId === m.userId) {
        return Response.json({ error: '본인은 내보낼 수 없습니다.' }, { status: 400 });
      }
      const { data: target } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .eq('academy_id', m.academyId)
        .maybeSingle();
      if (!target) {
        return Response.json({ error: '대상을 찾을 수 없습니다.' }, { status: 404 });
      }
      if (target.role !== 'staff') {
        return Response.json({ error: '선생님 계정만 내보낼 수 있습니다.' }, { status: 400 });
      }
      const { error } = await supabase
        .from('users')
        .update({ academy_id: null })
        .eq('id', userId)
        .eq('academy_id', m.academyId);
      if (error) throw error;
      return Response.json({ success: true });
    }

    return Response.json({ error: 'invite_id 또는 user_id가 필요합니다.' }, { status: 400 });
  } catch (error) {
    console.error('DELETE staff error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
