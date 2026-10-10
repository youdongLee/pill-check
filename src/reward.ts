import { grantPromotionReward } from '@apps-in-toss/native-modules';

export type GrantResult = { ok: boolean; detail: string };

/** 최근 지급 결과 (테스트 패널 표시용, 화면에 실패 문구는 띄우지 않는다) */
export const grantLog: string[] = [];

function log(line: string) {
  grantLog.unshift(`${new Date().toTimeString().slice(0, 8)} ${line}`);
  if (grantLog.length > 10) grantLog.length = 10;
  console.log('[pillcheck] grant', line);
}

/**
 * 토스포인트 지급. 실패해도 유저에게 알리지 않고 재시도하지 않는다(로그만).
 * 응답에 key 가 없으면 실패로 본다.
 */
export async function grantReward(promotionCode: string, amount: number): Promise<GrantResult> {
  try {
    const res: unknown = await grantPromotionReward({ params: { promotionCode, amount } });
    // 성공 = { key }. 실패 = { errorCode, message } | { code } | 'ERROR' | undefined(구버전 토스 앱)
    const failed = !(res && typeof res === 'object' && 'key' in (res as object));
    const detail = JSON.stringify(res ?? null).slice(0, 160);
    log(`${promotionCode.slice(0, 12)} ${amount} ${failed ? 'FAIL' : 'OK'} ${detail}`);
    return { ok: !failed, detail };
  } catch (e) {
    const detail = String((e as Error)?.message ?? e).slice(0, 160);
    log(`${promotionCode.slice(0, 12)} ${amount} THROW ${detail}`);
    return { ok: false, detail };
  }
}
