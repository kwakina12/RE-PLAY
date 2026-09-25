export const CATEGORIES = { food: '음식·배달', shopping: '쇼핑', transport: '이동', hobby: '취미·콘텐츠', experience: '여행·경험', subscription: '구독', living: '생활·건강', other: '기타' } as const;
export const VERDICTS = { repeat: { label: '다시 쓸래', motif: 'loop' }, change: { label: '다음엔 바꿀래', motif: 'redirect' }, unsure: { label: '아직 모르겠어', motif: 'pause' } } as const;
export const REPEAT_REASONS = { frequent_use: '자주 써요', time_saved: '시간을 아꼈어요', joy: '즐거웠어요', connection: '관계에 도움이 됐어요', problem_solved: '필요한 문제를 해결했어요', other: '기타' } as const;
export const CHANGE_REASONS = { unused: '거의 안 썼어요', expectation_gap: '기대와 달랐어요', excess_quantity: '양이 많았어요', duplicate: '비슷한 게 있어요', budget_burden: '비용이 부담됐어요', other: '기타' } as const;
