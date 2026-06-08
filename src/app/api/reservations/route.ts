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
    const { id, status, notes } = body;

    if (!id || !status) {
      return Response.json({ error: 'id와 status가 필요합니다.' }, { status: 400 });
    }

    const validStatuses = ['confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return Response.json(
        { error: `status는 ${validStatuses.join(', ')} 중 하나여야 합니다.` },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data: reservation, error } = await supabase
      .from('reservations')
      .update({
        status,
        ...(notes !== undefined && { notes }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, trial_slots(*)')
      .single();

    if (error) throw error;

    // Re-open slot if cancelled
    if (status === 'cancelled' && reservation?.trial_slots) {
      await supabase
        .from('trial_slots')
        .update({ is_available: true })
        .eq('id', reservation.trial_slots.id);
    }

    // 예약 확정 시 학부모에게 알림톡 발송
    if (status === 'confirmed' && reservation?.parent_phone) {
      const slot = reservation.trial_slots;
      sendAlimtalk(reservation.parent_phone, 'reservation_confirmed', {
        date: slot?.date || '',
        time: slot?.time_start ? `${slot.time_start}~${slot.time_end}` : '',
      }).catch(() => {}); // 알림톡 실패해도 API는 성공 처리
    }

    return Response.json({ data: reservation });
  } catch (error) {
    console.error('PATCH reservation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateReservationRequest & { academy_id: string } =
      await request.json();

    const supabase = getServiceClient();

    // Check slot availability
    const { data: slot } = await supabase
      .from('trial_slots')
      .select('*')
      .eq('id', body.trial_slot_id)
      .single();

    if (!slot || !slot.is_available) {
      return Response.json(
        { error: '해당 시간대는 이미 예약이 마감되었습니다.' },
        { status: 409 }
      );
    }

    // Create reservation
    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert({
        trial_slot_id: body.trial_slot_id,
        academy_id: body.academy_id,
        parent_name: body.parent_name,
        parent_phone: body.parent_phone || null,
        child_grade: body.child_grade || null,
        child_name: body.child_name || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Mark slot as unavailable
    await supabase
      .from('trial_slots')
      .update({ is_available: false })
      .eq('id', body.trial_slot_id);

    return Response.json({ data: reservation }, { status: 201 });
  } catch (error) {
    console.error('POST reservation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
