import { grantPromotionReward } from '@apps-in-toss/native-modules';

/**
 * 토스포인트 프로모션 리워드 지급 (best-effort).
 * grantPromotionReward는 환경에 따라 throw하지 않고 결과 객체를 반환할 수 있어,
 * 예외/실패를 모두 흡수하고 성공 여부만 boolean으로 돌려준다.
 */
export async function grantReward(promotionCode: string, amount: number): Promise<boolean> {
  try {
    const res: unknown = await grantPromotionReward({ params: { promotionCode, amount } });
    if (res && typeof res === 'object' && 'success' in res) {
      return Boolean((res as { success?: unknown }).success);
    }
    return true;
  } catch {
    return false;
  }
}
