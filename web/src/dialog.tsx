/**
 * 앱 안 안내 창 — RN 의 Alert.alert 자리.
 * ask(제목, 본문, 확인 글자, 취소 글자?, 위험?) → 확인이면 true. 한 번에 하나만 뜬다.
 * 뒤로가기·바깥 누름 = 취소.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useLayer } from './lib/nav';

interface DialogSpec {
  title: string;
  body?: string;
  ok: string;
  cancel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

export type Ask = (title: string, body?: string, ok?: string, cancel?: string, danger?: boolean) => Promise<boolean>;

const C = createContext<Ask | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const cur = useRef<DialogSpec | null>(null);

  const close = useCallback((v: boolean) => {
    const d = cur.current;
    if (!d) return;
    cur.current = null;
    setDialog(null);
    d.resolve(v);
  }, []);

  const ask = useCallback<Ask>(
    (title, body, ok = '확인', cancel, danger) =>
      new Promise<boolean>((resolve) => {
        // 이미 떠 있으면 새 창은 띄우지 않는다(연타)
        if (cur.current) {
          resolve(false);
          return;
        }
        const d: DialogSpec = { title, body, ok, cancel, danger, resolve };
        cur.current = d;
        setDialog(d);
      }),
    [],
  );

  useLayer(dialog != null, () => close(false));

  return (
    <C.Provider value={ask}>
      {children}
      {dialog && (
        <div className="dim center" onClick={() => close(false)}>
          <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>{dialog.title}</h3>
            {dialog.body && <p className="dialog-body">{dialog.body}</p>}
            <div className="dialog-btns">
              {dialog.cancel && (
                <button className="dialog-btn ghost" onClick={() => close(false)}>
                  {dialog.cancel}
                </button>
              )}
              <button className={`dialog-btn ${dialog.danger ? 'danger' : 'primary'}`} onClick={() => close(true)}>
                {dialog.ok}
              </button>
            </div>
          </div>
        </div>
      )}
    </C.Provider>
  );
}

export function useAsk(): Ask {
  const v = useContext(C);
  if (!v) throw new Error('DialogProvider 안에서만 쓸 수 있어요');
  return v;
}
