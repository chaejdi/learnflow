// ===== Database Models =====

export interface Academy {
  id: string;
  name: string;
  address: string;
  phone: string;
  owner_id: string;
  kakao_channel_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  academy_id: string;
  name: string;
  target_grade: string;
  schedule: string;
  monthly_fee: number;
  material_fee: number;
  capacity: number;
  enrolled_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrialSlot {
  id: string;
  subject_id: string;
  date: string;
  time_start: string;
  time_end: string;
  is_available: boolean;
  created_at: string;
}

export interface Reservation {
  id: string;
  trial_slot_id: string;
  academy_id: string;
  parent_name: string;
  parent_phone: string | null;
  child_grade: string | null;
  child_name: string | null;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Conversation {
  id: string;
  academy_id: string;
  kakao_user_id: string;
  messages: ChatMessage[];
  reservation_id: string | null;
  status: ConversationStatus;
  needs_owner_reply: boolean;
  created_at: string;
  updated_at: string;
}

export type ConversationStatus = 'active' | 'resolved' | 'escalated';

export interface ChatMessage {
  role: 'parent' | 'ai' | 'owner';
  content: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  academy_id: string | null;
  role: UserRole;
  created_at: string;
}

export type UserRole = 'owner' | 'staff' | 'admin';

// ===== API Request/Response Types =====

export interface ChatRequest {
  academy_id: string;
  kakao_user_id: string;
  message: string;
}

export interface ChatResponse {
  reply: string;
  conversation_id: string;
  needs_reservation: boolean;
}

export interface CreateReservationRequest {
  trial_slot_id: string;
  parent_name: string;
  parent_phone?: string;
  child_grade?: string;
  child_name?: string;
}

export interface UpdateAcademyRequest {
  name?: string;
  address?: string;
  phone?: string;
  description?: string;
  kakao_channel_id?: string;
}

export interface CreateSubjectRequest {
  name: string;
  target_grade: string;
  schedule: string;
  monthly_fee: number;
  material_fee: number;
  capacity: number;
}

// ===== Dashboard Stats =====

export interface DashboardStats {
  total_inquiries: number;
  total_reservations: number;
  total_enrolled: number;
  conversion_rate: number;
  inquiries_change: number;
  reservations_change: number;
}

// ===== Kakao Types =====

export interface KakaoWebhookPayload {
  userRequest: {
    utterance: string;
    user: {
      id: string;
      properties: Record<string, string>;
    };
  };
  bot: {
    id: string;
  };
  action: {
    id: string;
    name: string;
  };
}

export interface KakaoResponse {
  version: '2.0';
  template: {
    outputs: KakaoOutput[];
    quickReplies?: KakaoQuickReply[];
  };
}

export interface KakaoOutput {
  simpleText?: { text: string };
  simpleImage?: { imageUrl: string; altText: string };
}

export interface KakaoQuickReply {
  label: string;
  action: 'message' | 'block';
  messageText?: string;
  blockId?: string;
}
