import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireAuth, isAuthError } from '@/lib/auth';
import { sendAlimtalk } from '@/lib/kakao';
import type { CreateReservationRequest } from '@/types';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const supabase = getServiceClient();
    const academyId = request.nextUrl.searchParams.get('academy_id');

    if (!academyId) {
      return Response.json({ error: 'academy_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reservations')
      .select('*, trial_slots(*, subjects(name))')
      .eq('academy_id', academyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('GET reservations error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const {
      id, status, notes,
      parent_name, parent_phone, child_name, child_grade,
      // 연결된 체험슬롯 수정용
      subject_id, slot_date, slot_time_start, slot_time_end,
    } = body;

    if (!id) {
      return Response.json({ error: 'id가 필요합니다.' }, { status: 400 });
    }
    if (status !== undefined && !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return Response.json({ error: 'status 값이 올바르지 않습니다.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (parent_name !== undefined) updates.parent_name = parent_name;
    if (parent_phone !== undefined) updates.parent_phone = parent_phone;
    if (child_name !== undefined) updates.child_name = child_name;
    if (child_grade !== undefined) updates.child_grade = child_grade;

    const { data: reservation, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select('*, trial_slots(*)')
      .single();

    if (error) throw error;

    // 연결된 체험슬롯(날짜/시간/과목) 수정
    if (reservation?.trial_slots?.id && (subject_id || slot_date || slot_time_start || slot_time_end)) {
      const slotUpdates: Record<string, unknown> = {};
      if (subject_id) slotUpdates.subject_id = subject_id;
      if (slot_date) slotUpdates.date = slot_date;
      if (slot_time_start) slotUpdates.time_start = slot_time_start;
      if (slot_time_end) slotUpdates.time_end = slot_time_end;
      await supabase.from('trial_slots').update(slotUpdates).eq('id', reservation.trial_slots.id);
    }

    // 취소 시 슬롯 재오픈
    if (status === 'cancelled' && reservation?.trial_slots) {
      await supabase.from('trial_slots').update({ is_available: true }).eq('id', reservation.trial_slots.id);
    }

    // 예약 확정 시 학부모에게 알림톡 발송
    if (status === 'confirmed' && reservation?.parent_phone) {
      const slot = reservation.trial_slots;
      sendAlimtalk(reservation.parent_phone, 'reservation_confirmed', {
        date: slot?.date || '',
        time: slot?.time_start ? `${slot.time_start}~${slot.time_end}` : '',
      }).catch(() => {});
    }

    return Response.json({ data: reservation });
  } catch (error) {
    console.error('PATCH reservation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body: CreateReservationRequest & {
      academy_id: string;
      status?: string;
      subject_id?: string;
      slot_date?: string;
      slot_time_start?: string;
      slot_time_end?: string;
    } = await request.json();

    const supabase = getServiceClient();

    let trialSlotId = body.trial_slot_id;

    // 슬롯 id 없이 날짜/시간/과목으로 직접 추가 (대시보드 수동 등록)
    if (!trialSlotId) {
      if (!body.subject_id || !body.slot_date || !body.slot_time_start || !body.slot_time_end) {
        return Response.json(
          { error: '과목, 날짜, 시작/종료 시간이 필요합니다.' },
          { status: 400 }
        );
      }
      const { data: newSlot, error: slotErr } = await supabase
        .from('trial_slots')
        .insert({
          subject_id: body.subject_id,
          date: body.slot_date,
          time_start: body.slot_time_start,
          time_end: body.slot_time_end,
          is_available: false,
        })
        .select('id')
        .single();
      if (slotErr || !newSlot) throw slotErr || new Error('슬롯 생성 실패');
      trialSlotId = newSlot.id;
    } else {
      // 기존 슬롯 예약 시 마감 처리
      await supabase.from('trial_slots').update({ is_available: false }).eq('id', trialSlotId);
    }

    const status = body.status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(body.status)
      ? body.status
      : 'pending';

    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert({
        trial_slot_id: trialSlotId,
        academy_id: body.academy_id,
        parent_name: body.parent_name,
        parent_phone: body.parent_phone || null,
        child_grade: body.child_grade || null,
        child_name: body.child_name || null,
        status,
      })
      .select('*, trial_slots(*, subjects(name))')
      .single();

    if (error) throw error;

    return Response.json({ data: reservation }, { status: 201 });
  } catch (error) {
    console.error('POST reservation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return Response.json({ error: 'id required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 연결된 체험슬롯도 함께 정리 (수동 등록분)
    const { data: resv } = await supabase
      .from('reservations')
      .select('trial_slot_id')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) throw error;

    if (resv?.trial_slot_id) {
      await supabase.from('trial_slots').delete().eq('id', resv.trial_slot_id);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE reservation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
