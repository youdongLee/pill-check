import { Storage } from '@apps-in-toss/framework';
import { INTERNAL__appBridgeHandler, isMinVersionSupported } from '@apps-in-toss/native-modules';

/**
 * 영양제 챙겨먹기 — 매일 오전 9시 "아침 영양제" 알림 동의.
 *
 * 동의를 받아 두면 토스가 정해진 시각에 대신 보낸다('토스에게 발송 요청하기' — 서버 없음).
 * 콘솔: 알림동의문 132129 "매일 아침 영양제 복용 알림"(SCHEDULED 매일 09:00) + 정기 템플릿, 발송 코드 TEMPLATE_CODE
 *
 * ⚠️ 이 앱의 SDK(@apps-in-toss/framework 2.0.9)엔 알림 동의 함수가 없어 네이티브 브릿지를 직접 부른다
 *    (혈압수첩 src/notify.ts 와 같은 방식).
 * 동의 화면은 **유저가 버튼을 눌렀을 때만** 띄운다(들어오자마자 띄우면 검수 반려 사유).
 */
// 10/23 MCP 템플릿 생성이 '스마트 메시지 캠페인을 찾을 수 없습니다'로 5번 실패(202262~202266, 코드 daily_pill·morning_pill·daily_pill_am·am_pill·pill_9am 은 이미 점유됨)
// → 템플릿은 이 코드(morning9)로 만든다. 템플릿이 생기기 전엔 번들을 만들지 말 것
const TEMPLATE_CODE = 'pillcheck-morning9';
const MIN_VERSION = { android: '5.255.0', ios: '5.255.0' } as const;

/** 동의했거나 거절한 사람에게는 줄을 다시 보이지 않는다 */
const STATE_KEY = '@pillcheck/notify_daily_v1';

export type NotifyState = 'unknown' | 'agreed' | 'rejected';
export type AgreementResult = 'agreed' | 'rejected' | 'error';

export function notifySupported(): boolean {
  try {
    return isMinVersionSupported(MIN_VERSION);
  } catch {
    return false;
  }
}

export async function loadNotifyState(): Promise<NotifyState> {
  try {
    const v = await Storage.getItem(STATE_KEY);
    return v === 'agreed' || v === 'rejected' ? v : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** 토스 알림 동의 화면을 띄운다. 이미 동의했으면 화면 없이 바로 agreed. */
export function requestDailyNotify(): Promise<AgreementResult> {
  return new Promise((resolve) => {
    let done = false;
    let cleanup: (() => void) | undefined;
    const finish = (r: AgreementResult) => {
      if (done) return;
      done = true;
      try {
        cleanup?.();
      } catch {
        /* 무시 */
      }
      if (r !== 'error') void Storage.setItem(STATE_KEY, r).catch(() => {});
      resolve(r);
    };
    try {
      cleanup = INTERNAL__appBridgeHandler.invokeAppBridgeMethod(
        'requestNotificationAgreement',
        { templateCode: TEMPLATE_CODE },
        {
          onSuccess: (result: { agreementResult?: string }) =>
            finish(result?.agreementResult === 'agreementRejected' ? 'rejected' : 'agreed'),
          onError: () => finish('error'),
        }
      );
    } catch {
      finish('error');
    }
  });
}
