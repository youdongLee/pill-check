/**
 * 영양제 챙겨먹기 (pillcheck) OCR API — Cloudflare Worker
 *
 * 앱이 성분표 사진을 찍어 보내면 성분명과 함량을 뽑아 돌려준다.
 * 앱이 아는 성분 목록을 함께 보내오므로, Worker 는 그 목록 안에서만 답하게 한다
 * (앱 사전이 늘어나도 Worker 를 고칠 필요가 없다).
 *
 *   POST /ocr      { image, mediaType, ingredients[] } → { items[], productName, note }
 *   GET  /health   상태 확인
 *
 * API 키는 secret 으로만 두고 앱 번들에는 넣지 않는다.
 */
import Anthropic from '@anthropic-ai/sdk';

export interface Env {
  ANTHROPIC_API_KEY: string;
  RATE: KVNamespace;
}

/** 성분표 한 장을 읽는 데 쓰는 모델 */
const MODEL = 'claude-opus-5';

/** 기기 하나가 하루에 부를 수 있는 횟수 — 영양제 등록은 드문 일이라 넉넉하다 */
const DAILY_LIMIT_PER_DEVICE = 20;
/** 앱 전체 하루 한도 — 사고성 과금 방지 */
const DAILY_LIMIT_TOTAL = 2000;

/** 이미지 용량 상한(base64 문자 수). 약 4MB */
const MAX_IMAGE_CHARS = 5_600_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

interface IngredientHint {
  key: string;
  name: string;
  unit: string;
}

interface OcrRequest {
  /** base64 (data URI 접두사 없이) */
  image: string;
  mediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** 앱이 아는 성분 목록 — 이 안에서만 고르게 한다 */
  ingredients: IngredientHint[];
  /** 기기 구분용 익명 id (레이트 리밋 키) */
  deviceId?: string;
}

/** 오늘 날짜(KST) — 한도 카운터 키에 쓴다 */
function todayKst(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

/** 카운터를 1 올리고 한도를 넘었는지 본다 */
async function bumpAndCheck(kv: KVNamespace, key: string, limit: number): Promise<boolean> {
  const raw = await kv.get(key);
  const count = raw ? Number(raw) : 0;
  if (count >= limit) return false;
  // 자정이 지나면 자연 소멸하도록 26시간 TTL
  await kv.put(key, String(count + 1), { expirationTtl: 60 * 60 * 26 });
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (url.pathname === '/health') {
      return json({ ok: true, model: MODEL, hasKey: Boolean(env.ANTHROPIC_API_KEY) });
    }

    if (url.pathname !== '/ocr' || request.method !== 'POST') {
      return json({ error: 'not_found' }, 404);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'not_configured', message: '서버에 API 키가 설정되지 않았어요.' }, 503);
    }

    let body: OcrRequest;
    try {
      body = await request.json<OcrRequest>();
    } catch {
      return json({ error: 'bad_json' }, 400);
    }

    if (!body?.image || typeof body.image !== 'string') {
      return json({ error: 'no_image' }, 400);
    }
    if (body.image.length > MAX_IMAGE_CHARS) {
      return json({ error: 'image_too_large', message: '사진이 너무 커요. 다시 찍어주세요.' }, 413);
    }
    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return json({ error: 'no_ingredient_list' }, 400);
    }

    // 한도 확인 — 기기별과 전체를 모두 본다
    const day = todayKst();
    const deviceKey = `d:${day}:${body.deviceId ?? 'anon'}`;
    const totalKey = `t:${day}`;
    const [deviceOk, totalOk] = await Promise.all([
      bumpAndCheck(env.RATE, deviceKey, DAILY_LIMIT_PER_DEVICE),
      bumpAndCheck(env.RATE, totalKey, DAILY_LIMIT_TOTAL),
    ]);
    if (!deviceOk || !totalOk) {
      return json(
        { error: 'rate_limited', message: '오늘은 사진 인식을 많이 사용하셨어요. 내일 다시 시도해 주세요.' },
        429,
      );
    }

    const allowed = body.ingredients
      .map((i) => `${i.key} = ${i.name} (단위 ${i.unit})`)
      .join('\n');

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'medium',
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['items', 'readable'],
              properties: {
                readable: {
                  type: 'boolean',
                  description: '사진에서 성분표를 읽을 수 있었는지',
                },
                productName: {
                  type: 'string',
                  description: '제품 이름이 보이면 적는다. 없으면 빈 문자열',
                },
                items: {
                  type: 'array',
                  description: '아래 목록에 있는 성분만, 1회 섭취량 기준으로',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['key', 'amount'],
                    properties: {
                      key: { type: 'string', description: '허용된 성분 key 중 하나' },
                      amount: { type: 'number', description: '지정된 단위로 환산한 수치' },
                    },
                  },
                },
                note: {
                  type: 'string',
                  description: '읽지 못했거나 확실하지 않은 부분을 한국어 한 문장으로. 없으면 빈 문자열',
                },
              },
            },
          },
        },
        system: [
          '너는 건강기능식품 포장의 영양성분표를 읽어 성분과 함량을 뽑아내는 도구다.',
          '',
          '규칙:',
          '- 아래 "허용 성분 목록"에 있는 key 만 쓴다. 목록에 없는 성분은 무시한다.',
          '- 함량은 반드시 목록에 적힌 단위로 환산한다. 예: 1000㎍ 를 mg 단위 성분에 넣을 때는 1 로 적는다.',
          '- IU 로 적힌 값은 환산한다. 비타민D 1 IU = 0.025㎍, 비타민E 1 IU = 0.67mg(d-알파토코페롤 기준).',
          '- "1일 섭취량 2정" 처럼 여러 정을 한 번에 먹는 제품이면, 표에 적힌 1회 섭취량 기준 값을 그대로 쓴다.',
          '- %영양성분기준치(%DV)는 함량이 아니다. 절대 그 숫자를 쓰지 않는다.',
          '- 글자가 흐리거나 잘려서 확신이 없으면 그 성분은 빼고, note 에 무엇이 불확실한지 적는다.',
          '- 성분표가 아예 안 보이면 readable 을 false 로 하고 items 를 비운다.',
          '- 추측해서 채우지 않는다. 사진에 적힌 것만 옮긴다.',
          '',
          '허용 성분 목록:',
          allowed,
        ].join('\n'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: body.mediaType ?? 'image/jpeg',
                  data: body.image,
                },
              },
              {
                type: 'text',
                text: '이 사진의 영양성분표를 읽어서 성분과 1회 섭취량 기준 함량을 뽑아줘.',
              },
            ],
          },
        ],
      });

      if (response.stop_reason === 'refusal') {
        return json({ error: 'refused', message: '이 사진은 읽을 수 없어요.' }, 422);
      }

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        return json({ error: 'empty_response' }, 502);
      }

      let parsed: { readable: boolean; items: { key: string; amount: number }[]; productName?: string; note?: string };
      try {
        parsed = JSON.parse(textBlock.text);
      } catch {
        return json({ error: 'bad_model_output' }, 502);
      }

      // 모델이 목록 밖 key 나 이상한 수치를 냈을 경우를 대비해 서버에서 한 번 더 거른다
      const allowedKeys = new Set(body.ingredients.map((i) => i.key));
      const items = (parsed.items ?? []).filter(
        (it) =>
          it &&
          allowedKeys.has(it.key) &&
          Number.isFinite(it.amount) &&
          it.amount > 0 &&
          it.amount < 1_000_000,
      );

      return json({
        readable: Boolean(parsed.readable),
        items,
        productName: (parsed.productName ?? '').slice(0, 40),
        note: (parsed.note ?? '').slice(0, 200),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // 키 오류·한도 초과 등은 앱에서 문구만 다르게 보여주면 되므로 상태코드로 구분한다
      const status = err instanceof Anthropic.RateLimitError ? 429
        : err instanceof Anthropic.AuthenticationError ? 503
        : err instanceof Anthropic.APIError ? 502
        : 500;
      return json({ error: 'upstream', message }, status);
    }
  },
};
