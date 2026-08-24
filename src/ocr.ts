import { openCamera } from '@apps-in-toss/native-modules';
import { INGREDIENTS } from '../data/ingredients';
import type { ProductIngredient } from '../data/products';

/** 성분표 인식 서버 (Cloudflare Worker). 배포 후 주소를 여기에 넣는다. */
const OCR_ENDPOINT = 'https://pillcheck-api.jameslee0206.workers.dev/ocr';

/** 사진 가로 상한 — 글자가 읽힐 만큼은 크고, 전송이 무겁지 않을 만큼은 작게 */
const MAX_WIDTH = 1600;

export interface OcrResult {
  ok: true;
  items: ProductIngredient[];
  productName: string;
  note: string;
  /** 성분표를 아예 못 읽은 경우 */
  readable: boolean;
}

export interface OcrFailure {
  ok: false;
  /** 유저에게 그대로 보여줄 문구 */
  message: string;
  /** 유저가 촬영을 취소한 경우 — 조용히 넘어간다 */
  canceled?: boolean;
}

/** 이 기기에서 카메라 인식을 쓸 수 있는지 */
export function isOcrSupported(): boolean {
  try {
    return typeof openCamera === 'function' && (openCamera as { isSupported?: () => boolean }).isSupported?.() !== false;
  } catch {
    return false;
  }
}

/**
 * 성분표를 찍어서 성분 목록을 받아온다.
 * 실패는 예외로 던지지 않고 결과 객체로 돌려준다 — 화면에서 문구만 보여주면 되도록.
 */
export async function scanIngredientLabel(deviceId?: string): Promise<OcrResult | OcrFailure> {
  let base64: string;
  try {
    const shot = await openCamera({ base64: true, maxWidth: MAX_WIDTH });
    const data = (shot as { base64?: string; uri?: string } | undefined)?.base64;
    if (!data) return { ok: false, message: '사진을 가져오지 못했어요.', canceled: true };
    // data URI 로 올 때를 대비해 접두사를 떼어낸다
    base64 = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data;
  } catch {
    // 권한 거부·취소가 모두 여기로 온다
    return { ok: false, message: '카메라를 열지 못했어요. 사진 권한을 확인해 주세요.', canceled: true };
  }

  // 서버가 이 목록 안에서만 답하도록 앱이 아는 성분을 함께 보낸다
  const ingredients = INGREDIENTS.map((i) => ({ key: i.key, name: i.name, unit: i.unit }));

  try {
    const res = await fetch(OCR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mediaType: 'image/jpeg', ingredients, deviceId }),
    });

    if (res.status === 429) {
      return { ok: false, message: '오늘은 사진 인식을 많이 사용하셨어요. 내일 다시 시도해 주세요.' };
    }
    if (!res.ok) {
      return { ok: false, message: '성분표를 읽지 못했어요. 잠시 후 다시 시도해 주세요.' };
    }

    const data = (await res.json()) as {
      readable?: boolean;
      items?: { key: string; amount: number }[];
      productName?: string;
      note?: string;
    };

    return {
      ok: true,
      readable: Boolean(data.readable),
      items: (data.items ?? []).map((i) => ({ key: i.key, amount: i.amount })),
      productName: data.productName ?? '',
      note: data.note ?? '',
    };
  } catch {
    return { ok: false, message: '인터넷 연결을 확인해 주세요.' };
  }
}
