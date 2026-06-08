import { getServiceClient } from '@/lib/supabase';

const seedConversations = [
  {
    kakao_user_id: 'test_parent_a1b2',
    status: 'active',
    needs_owner_reply: false,
    messages: [
      { role: 'parent', content: '초등 3학년 수학 수업 문의드려요', timestamp: new Date(Date.now() - 3600000).toISOString() },
      {
        role: 'ai',
        content: '안녕하세요! 문의 감사합니다 😊 초등 3학년 수학반은 화·목 3:30~5:00에 운영 중이에요. 현재 2자리 남아있습니다. 체험수업도 가능한데, 예약해드릴까요?',
        timestamp: new Date(Date.now() - 3595000).toISOString(),
      },
      { role: 'parent', content: '네 체험수업 예약하고 싶어요!', timestamp: new Date(Date.now() - 3000000).toISOString() },
      {
        role: 'ai',
        content: '좋습니다! 이번 주 목요일(6/5) 3:30에 체험수업 가능하세요? 아이 이름과 연락처를 알려주시면 예약 도와드릴게요.',
        timestamp: new Date(Date.now() - 2995000).toISOString(),
      },
    ],
  },
  {
    kakao_user_id: 'test_parent_c3d4',
    status: 'escalated',
    needs_owner_reply: true,
    messages: [
      { role: 'parent', content: '수강료 할인 가능한가요? 형제 둘 다 보내려고 하는데요', timestamp: new Date(Date.now() - 7200000).toISOString() },
      {
        role: 'ai',
        content: '형제 할인에 대해서는 원장님께서 직접 안내드리겠습니다. 잠시만 기다려주세요!',
        timestamp: new Date(Date.now() - 7195000).toISOString(),
      },
    ],
  },
  {
    kakao_user_id: 'test_parent_e5f6',
    status: 'resolved',
    needs_owner_reply: false,
    messages: [
      { role: 'parent', content: '중등 영어 시간표 알려주세요', timestamp: new Date(Date.now() - 86400000).toISOString() },
      {
        role: 'ai',
        content: '중등 영어반은 월·수·금 5:00~6:30에 운영됩니다. 현재 3자리 남아있어요! 더 궁금한 점 있으시면 편하게 물어봐주세요.',
        timestamp: new Date(Date.now() - 86395000).toISOString(),
      },
      { role: 'parent', content: '감사합니다! 다음주에 방문해볼게요', timestamp: new Date(Date.now() - 86000000).toISOString() },
      {
        role: 'ai',
        content: '네, 방문 기다리고 있을게요! 궁금한 점 있으시면 언제든 카톡 주세요 😊',
        timestamp: new Date(Date.now() - 85995000).toISOString(),
      },
    ],
  },
  {
    kakao_user_id: 'test_parent_g7h8',
    status: 'escalated',
    needs_owner_reply: true,
    messages: [
      { role: 'parent', content: '안녕하세요, 초등 5학년인데 수학 기초가 많이 부족해요. 어떤 반이 맞을까요?', timestamp: new Date(Date.now() - 1800000).toISOString() },
      {
        role: 'ai',
        content: '안녕하세요! 기초가 부족한 경우 레벨 테스트 후 적합한 반을 안내드리고 있어요. 원장님께서 직접 상담해드릴 수 있도록 연결드리겠습니다.',
        timestamp: new Date(Date.now() - 1795000).toISOString(),
      },
      { role: 'parent', content: '네 부탁드려요. 평일 저녁에 통화 가능합니다', timestamp: new Date(Date.now() - 1500000).toISOString() },
    ],
  },
  {
    kakao_user_id: 'test_parent_i9j0',
    status: 'active',
    needs_owner_reply: false,
    messages: [
      { role: 'parent', content: '학원 위치가 어디인가요?', timestamp: new Date(Date.now() - 600000).toISOString() },
      {
        role: 'ai',
        content: '서울시 강남구 역삼동 123-45에 위치해 있습니다. 역삼역 3번 출구에서 도보 5분 거리예요. 주차는 건물 지하주차장 이용 가능합니다!',
        timestamp: new Date(Date.now() - 595000).toISOString(),
      },
    ],
  },
];

export async function POST() {
  try {
    const supabase = getServiceClient();

    // 학원이 없으면 유저 + 학원 자동 생성
    let { data: academy } = await supabase
      .from('academies')
      .select('id')
      .limit(1)
      .single();

    if (!academy) {
      // 데모 유저 생성
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          email: 'demo@learnflow.kr',
          name: '데모 원장님',
          phone: '010-0000-0000',
          role: 'owner',
        })
        .select('id')
        .single();

      if (userError) throw userError;

      // 학원 생성
      const { data: newAcademy, error: academyError } = await supabase
        .from('academies')
        .insert({
          name: '우리동네 수학학원',
          address: '서울시 강남구 역삼동 123-45',
          phone: '02-1234-5678',
          owner_id: user!.id,
          description: '초등·중등 수학 전문 학원. 개별 맞춤 수업으로 아이의 수학 자신감을 키워드립니다.',
        })
        .select('id')
        .single();

      if (academyError) throw academyError;

      // 유저에 academy_id 연결
      await supabase
        .from('users')
        .update({ academy_id: newAcademy!.id })
        .eq('id', user!.id);

      academy = newAcademy;
    }

    const academyId = academy!.id;

    const rows = seedConversations.map((conv) => ({
      academy_id: academyId,
      kakao_user_id: conv.kakao_user_id,
      status: conv.status,
      needs_owner_reply: conv.needs_owner_reply,
      messages: conv.messages,
    }));

    const { data, error } = await supabase
      .from('conversations')
      .insert(rows)
      .select();

    if (error) throw error;

    return Response.json({ data, count: data.length }, { status: 201 });
  } catch (error) {
    console.error('Seed conversations error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
