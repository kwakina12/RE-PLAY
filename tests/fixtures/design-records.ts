import type { RecordInput } from '@/features/records/types';
// Test/design documentation only. Never imported by application code or seeded into DB.
export const designRecords: RecordInput[] = [
  { title: '동네 산책 모임', category: 'experience', amount: null, verdict: 'repeat', reasonCode: 'connection', nextRule: '다음엔 친구와 함께' },
  { title: '대용량 간식', category: 'food', amount: 12000, verdict: 'change', reasonCode: 'excess_quantity', nextRule: '작은 포장부터' },
  { title: '첫 전시 관람', category: 'experience', amount: null, verdict: 'unsure', reasonCode: null, nextRule: null },
];
