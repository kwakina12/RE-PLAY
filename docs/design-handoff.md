# Figma 디자인 핸드오프

이번 구현은 데이터·검증 기반입니다. 디자인 완성본이나 실제 입력 플로우가 아닙니다. 컨셉은 [visual-concept.md](visual-concept.md), API는 [api-contract.md](api-contract.md)를 함께 읽으세요.

## 핵심 3화면

1. **소비 입력** `/records/new/expense`: 소비 이름, 카테고리, 금액(선택). 다음으로 이동.
2. **판단 입력** `/records/new/reflection`: “같은 돈이면 다시 쓸래?” / 판단·이유·다음 소비 기준. 카드 저장.
3. **결과·상세 카드** `/records/:id`: 저장 직후와 재열람을 같은 기록으로 표현. 수정/목록 이동. DB 성공 후에만 진입.

나머지 임시 경로는 `/`, `/records`, `/records/:id/edit`, `/settings`, 알 수 없는 경로의 NotFound입니다. 현재 화면에는 이름·예정 안내·홈 링크만 있고 홈에 경로 확인 링크가 있습니다. 예시 ID 경로도 지금은 껍데기이며 DB를 조회하지 않습니다.

## 필드와 오류

| 필드 | 필수/범위 | 디자인에 반영할 오류 안내 |
|---|---|---|
| title 소비 이름 | 필수, trim 후 1–40 JS length | 소비 이름을 입력해 주세요. / 소비 이름은 40자 이내로 입력해 주세요. |
| category | 필수, 아래 8개 | 카테고리를 선택해 주세요. |
| amount 금액 | 선택, null 또는 0–999999999 정수 | 금액은 0–999,999,999 범위의 정수로 입력해 주세요. |
| verdict 판단 | 필수, repeat/change/unsure | 판단을 선택해 주세요. |
| reasonCode 이유 | repeat/change에서 해당 목록 1개 필수, unsure에서 null | 선택한 판단에 맞는 이유를 골라 주세요. |
| nextRule 다음 소비 기준 | 선택, trim 후 최대 100자, 빈값=null; unsure는 null | 다음 소비 기준은 100자 이내로 입력해 주세요. |

현재 서비스의 검증 실패는 VALIDATION_ERROR + “입력값을 확인해 주세요.” 및 fields의 Zod 오류로 반환합니다. title/nextRule 길이 문구는 스키마의 한국어 메시지, 금액 파싱 문구는 normalizeAmount의 한국어 메시지입니다. 표의 선택형 오류 안내는 후속 UI에서 fields에 매핑할 사용자 문구 제안이며 지금 화면에 구현된 문구가 아닙니다. 중첩 fields 키는 input.title처럼 전달될 수 있습니다. 라이브러리 기본 오류를 그대로 사용자 화면에 노출하지 않도록 후속 UI에서 연결합니다.

길이는 JS string.length(UTF-16)이며 grapheme 수가 아닙니다. amountText는 빈값/공백→null, '0'→0, '12000'/'12,000'→12000. 소수·음수·지수·잘못된 쉼표는 거절합니다. 초기 필수값이 없는 초안도 저장되므로 초안 저장 성공과 카드 저장 성공을 혼동하지 않습니다.

카테고리: food 음식·배달 / shopping 쇼핑 / transport 이동 / hobby 취미·콘텐츠 / experience 여행·경험 / subscription 구독 / living 생활·건강 / other 기타.

repeat 이유: frequent_use 자주 써요 / time_saved 시간을 아꼈어요 / joy 즐거웠어요 / connection 관계에 도움이 됐어요 / problem_solved 필요한 문제를 해결했어요 / other 기타.

change 이유: unused 거의 안 썼어요 / expectation_gap 기대와 달랐어요 / excess_quantity 양이 많았어요 / duplicate 비슷한 게 있어요 / budget_burden 비용이 부담됐어요 / other 기타. 기타에 추가 텍스트는 필수가 아닙니다.

## 판단 분기

| 선택 | 라벨·모티프 | 이유 | 다음 기준 |
|---|---|---|---|
| repeat | 다시 쓸래 · loop | repeat 목록 | 선택 노출 |
| change | 다음엔 바꿀래 · redirect | change 목록 | 선택 노출 |
| unsure | 아직 모르겠어 · pause | 숨김, null | 숨김, null |

다른 판단으로 전환하면 이유를 초기화합니다. repeat↔change는 다음 기준을 유지합니다. unsure 전환 시 규칙이 있으면 삭제 확인이 필요합니다. transitionVerdict는 제안값과 requiresRuleDeletionConfirmation만 반환하고 원본을 변경하지 않습니다. 후속 UI는 취소 시 기존 state를 유지하고 확인 후에만 제안값을 적용합니다. 저장 API는 unsure의 non-null 이유/규칙을 조용히 지우지 않고 오류로 반환합니다.

## 설계할 상태

비어 있음, 입력 중, 필드 오류, 임시저장 중/실패, 최종 저장 중, 저장 실패, 성공, 수정 충돌을 설계합니다. 필드 오류는 아래에 표시하고 첫 오류에 포커스를 옮기는 방식을 검토하세요. 모바일 키보드가 CTA와 입력을 가리지 않도록 합니다.

- NOT_FOUND: 기록/초안 없음 안내와 목록 또는 새 작성으로 이동.
- CONFLICT: “다른 화면에서 수정됐어요. 최신 내용을 불러와 주세요.” 현재 입력을 조용히 버리지 않습니다.
- QUOTA_EXCEEDED: “저장 공간이 부족해요.” 입력 유지와 재시도/내보내기 검토.
- STORAGE_UNAVAILABLE: “브라우저 저장소를 사용할 수 없어요.” 저장 완료로 이동 금지.
- UNKNOWN: “처리하지 못했어요. 다시 시도해 주세요.”

개별 삭제/전체 삭제 확인, 목록/필터 결과 없음, 원본 로딩, 분석 선택 unset/enabled/disabled, 내보내기 실패도 후속 화면 범위입니다. 분석 선택은 로컬 설정만 구현되어 있습니다.

## 카드 위계와 예시

소비 이름 → 판단 → 이유 → 선택적 다음 기준 → 금액·카테고리·기록일. 색 외 이름·기호를 함께 표시합니다. 실제 기호·폰트·색·카드 레이아웃은 Figma에서 확정합니다. change는 실패 아이콘이 아니며 unsure도 저장 완료 카드입니다.

테스트 전용 fixture `tests/fixtures/design-records.ts`의 사례:
- 동네 산책 모임 / 다시 쓸래 / 관계에 도움이 됐어요 / 다음엔 친구와 함께 / 금액 생략 / 여행·경험.
- 대용량 간식 / 다음엔 바꿀래 / 양이 많았어요 / 작은 포장부터 / 12,000원 / 음식·배달.
- 첫 전시 관람 / 아직 모르겠어 / 이유·기준·금액 모두 생략 / 여행·경험.

fixture는 테스트에서만 사용하며 앱 DB에 삽입하지 않습니다. 한 기록만 있어도 가치를 표현하고 누적 수·연속 기록을 요구하지 않습니다. 기록일은 한국어 UI에서 Asia/Seoul로 표시할 예정입니다.

## 다음 Vertical Slice 연결 항목 — 아직 미구현

소비 입력→판단→저장→상세의 화면 흐름, 초안 ID 기반 복원 및 이어쓰기 선택, 300ms 디바운스 자동저장 hook, 초안별 쓰기 직렬화, 단계 이동 시 flush, 확정 저장 직전 타이머 취소+진행 중 쓰기 완료, 중복 클릭 방지, 삭제/전체 삭제 시 타이머 취소와 React 상태 초기화를 연결해야 합니다. 강제 종료 직전 저장은 보장할 수 없습니다.

최종 저장 성공은 service Result.ok와 트랜잭션 커밋 이후에만 표현합니다. 모션이 완료/다음 행동을 지연시키면 안 되며 감소된 모션에 대응해야 합니다. 모션은 이번 구현에 없습니다. 화면 간 E2E와 실제 모바일 저장 확인은 후속 단계입니다.

## 공통 글자 수 검증과 향후 화면 표시

`src/features/records/text-validation.ts`의 `validateTextLength(field, value)`가 단일 길이 검증 함수입니다. **trim 후 명시적인 JavaScript `string.length`**, 즉 UTF-16 코드 단위로 계산합니다. 제목은 1–40, 다음 소비 기준은 0–100입니다. 빈 다음 소비 기준은 스키마에서 null로 정규화합니다. unsure의 non-null 규칙 거절은 별도 판단 계약으로 유지합니다.

- 제목: 39 허용 / 40 허용 / 41 거절. 😀 20개는 40, 여기에 한글 한 글자를 붙이면 41이므로 거절.
- 다음 소비 기준: 99 허용 / 100 허용 / 101 거절. 😀 50개는 100, 여기에 한글 한 글자를 붙이면 101이므로 거절.
- 😀는 2, 👨‍👩‍👧‍👦는 11 코드 단위입니다. 보이는 문자 수나 grapheme 수가 아니며 Array.from/Intl.Segmenter로 대체하지 않습니다. 앞뒤 공백은 글자 수에서 제외합니다.

현재 schema.ts가 이 함수를 사용합니다. **향후 화면에 글자 수 표시가 생기면 같은 함수의 length/max를 표시하고 valid/tooShort/tooLong으로 상태를 판단하세요.** 예: `validateTextLength('title', title)` → `${length}/${max}`. 화면에서 별도 계산식이나 별도 최대 길이 숫자를 복제하지 않습니다. 글자 수 표시는 아직 구현하지 않았습니다. 미완성 초안은 이 길이 제한 때문에 저장을 막지 않으며 최종 카드 저장에서 확정 검증합니다.

`tests/unit/text-validation.test.ts`에서 두 필드 각각 일반 한글과 이모지 혼합 입력의 최대 직전·경계·초과, 공백 trim, 필수/선택 빈값, 복합 이모지 사례를 확인합니다.
