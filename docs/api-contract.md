# 내부 API와 구현 판단

`createServices(db, { clock, id })`는 기록/초안/설정 서비스를 합성합니다. 모든 서비스 메서드는 Promise<Result<T>>입니다. clock 기본값은 ISO UTC, id 기본값은 crypto.randomUUID. React 없이 호출할 수 있습니다. 테스트는 이름을 주입한 DB factory만 사용하고 운영 singleton은 없습니다.

| 메서드 | 인자 | 성공 data |
|---|---|---|
| startDraft | {mode:'create'} 또는 {mode:'edit', recordId} | Draft |
| listDrafts | 없음 | Draft[] |
| getDraft / deleteDraft | UUID | Draft / void |
| saveDraft | {id, values, step, expectedRevision} | Draft |
| createRecord | {draftId, recordId, input} | {record, created} |
| listRecords | {verdict?, category?} = {} | SpendingRecord[] |
| getRecord / deleteRecord | UUID | SpendingRecord / void |
| updateRecord | {id, draftId, input, expectedRevision} | SpendingRecord |
| getSettings | 없음 | AppSettings |
| updateSettings | {analyticsChoice} | AppSettings |
| exportRecords | 없음 | application/json Blob |
| clearAllData | 없음 | void |

Result 실패 code: VALIDATION_ERROR, NOT_FOUND, CONFLICT, STORAGE_UNAVAILABLE, QUOTA_EXCEEDED, UNKNOWN. fields는 Zod 경로별 메시지입니다. 서비스는 소비 원문과 오류 원문을 로그에 출력하지 않습니다.

## 책임과 원자성

- service: unknown 입력의 strict Zod 검증, 시각/ID 발급, Result 오류 변환. 검증 완료 후 repository로 전달.
- records/repository: record+draft 생성/수정/삭제의 모든 다중 테이블 트랜잭션.
- drafts/repository: 원본 복사+초안 생성, 초안 revision 검사+갱신의 트랜잭션.
- settings/repository: 세 테이블 clear, 읽기 전용 export snapshot. Blob은 transaction 밖에서 생성.
- 트랜잭션 안에는 DB 작업과 동기 메모리 객체 조립/조건 검사만 있고 네트워크·타이머·외부 비동기 작업이 없습니다.

동일 recordId가 존재하면 유효한 입력 검증 후 기존 기록을 created:false로 반환합니다. 재시도에서 제목 등을 덮어쓰지 않으며 전달된 다른 draft도 지우지 않습니다. record와 draft가 모두 없으면 NOT_FOUND. 수정은 원본 revision=expectedRevision=draft.baseRevision을 만족해야 하며 원본/초안 연결을 검사합니다. upsert하지 않습니다. 수정은 id/createdAt 보존, revision +1입니다. 초안도 expectedRevision과 step/mode를 검사하고 삭제된 행을 재생성하지 않습니다.

조회는 기록 createdAt 내림차순, 초안 updatedAt 내림차순이며 동률 id 오름차순(문자 코드 비교)입니다. 두 기록 필터는 AND입니다. deleteRecord는 모든 연결 초안을 함께 지우고 이미 없으면 성공합니다. 개별 초안 삭제도 이미 없으면 성공합니다.

## 선택 사항 명시

- 문서 우선순위: 사용자가 요청한 CODEX_START_PHASE_1_2 기준. 참고 기술 명세의 나머지 단계는 미구현.
- nextRule 필드는 생략/null/공백을 허용하고 null로 정규화합니다. unsure에서는 생략 또는 null만 허용하고 빈 문자열도 non-null이므로 거절합니다. reasonCode는 unsure에서도 명시적 null이 필요합니다. amount는 선택 UI이지만 API에서 null 또는 유효한 숫자를 명시해야 합니다.
- 쉼표 없는 숫자의 선행 0은 허용합니다. 쉼표는 1–3자리의 0 아닌 시작 묶음 뒤에 3자리 묶음만 허용합니다. 내부 공백/부호/소수/지수는 금지합니다.
- 초안 values는 전체 객체 교체이며 미완성 값을 위해 길이/판단-이유 조합/금액 형식은 제한하지 않습니다. 타입·enum·알 수 없는 필드는 검사합니다. 확정 검증은 최종 저장에서 별도로 수행합니다.
- 초안 연결/mode/step 불일치는 VALIDATION_ERROR, 없는 원본/초안은 NOT_FOUND, 버전 불일치는 CONFLICT.
- revision은 안전한 양의 정수이며 API에서 문자열 숫자로 변환하지 않습니다.
- getSettings 기본 updatedAt은 읽은 시점의 clock이며 DB에 자동 쓰지 않습니다. 동의 초기값은 unset.
- 알려진 quota 오류는 QUOTA_EXCEEDED. 알려진 접근/열기/닫힘/버전 오류는 STORAGE_UNAVAILABLE. 원인을 확정할 수 없는 AbortError 등은 UNKNOWN. Dexie inner/cause의 알려진 오류도 검사합니다.
- 개발 환경은 명시값이 없을 때 development. build는 preview/production의 명시값을 요구합니다. preview 서버는 산출물의 환경을 그대로 사용합니다.
- 초기화/업그레이드 실패 시 자동 삭제하지 않습니다. clearAllData는 명시 호출에만 행을 비우고 스키마 유지. UI 확인 다이얼로그와 타이머/상태 초기화는 후속 단계입니다.
- 브라우저 API 조립은 lazy factory로 제공합니다. 현재 임시 화면은 DB를 사용하지 않습니다.

## 호출 예시

```ts
import { createDatabase } from '@/lib/db';
import { createServices } from '@/lib/services';
const db = createDatabase('dasissum-dev');
const api = createServices(db);
const draft = await api.startDraft({ mode: 'create' });
if (draft.ok) {
  const saved = await api.createRecord({
    draftId: draft.data.id, recordId: draft.data.recordId,
    input: { title: '소비 이름', category: 'other', amount: null,
      verdict: 'unsure', reasonCode: null, nextRule: null },
  });
  // saved.ok 확인 후에만 후속 UI에서 저장 성공을 표시합니다.
}
```

## 공통 글자 수 검증과 향후 화면 표시

`src/features/records/text-validation.ts`의 `validateTextLength(field, value)`가 단일 길이 검증 함수입니다. **trim 후 명시적인 JavaScript `string.length`**, 즉 UTF-16 코드 단위로 계산합니다. 제목은 1–40, 다음 소비 기준은 0–100입니다. 빈 다음 소비 기준은 스키마에서 null로 정규화합니다. unsure의 non-null 규칙 거절은 별도 판단 계약으로 유지합니다.

- 제목: 39 허용 / 40 허용 / 41 거절. 😀 20개는 40, 여기에 한글 한 글자를 붙이면 41이므로 거절.
- 다음 소비 기준: 99 허용 / 100 허용 / 101 거절. 😀 50개는 100, 여기에 한글 한 글자를 붙이면 101이므로 거절.
- 😀는 2, 👨‍👩‍👧‍👦는 11 코드 단위입니다. 보이는 문자 수나 grapheme 수가 아니며 Array.from/Intl.Segmenter로 대체하지 않습니다. 앞뒤 공백은 글자 수에서 제외합니다.

현재 schema.ts가 이 함수를 사용합니다. **향후 화면에 글자 수 표시가 생기면 같은 함수의 length/max를 표시하고 valid/tooShort/tooLong으로 상태를 판단하세요.** 예: `validateTextLength('title', title)` → `${length}/${max}`. 화면에서 별도 계산식이나 별도 최대 길이 숫자를 복제하지 않습니다. 글자 수 표시는 아직 구현하지 않았습니다. 미완성 초안은 이 길이 제한 때문에 저장을 막지 않으며 최종 카드 저장에서 확정 검증합니다.

`tests/unit/text-validation.test.ts`에서 두 필드 각각 일반 한글과 이모지 혼합 입력의 최대 직전·경계·초과, 공백 trim, 필수/선택 빈값, 복합 이모지 사례를 확인합니다.
