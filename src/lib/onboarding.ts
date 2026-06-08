// 회원가입 시점에 세션이 아직 없을 수 있어(이메일 인증 on),
// 학원 정보를 임시 보관했다가 로그인 직후 생성하기 위한 키.
export const PENDING_ACADEMY_KEY = 'pending_academy';

export interface PendingAcademy {
  name: string;
  address?: string;
  phone?: string;
  owner_name?: string;
}
