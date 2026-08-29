import type { Result } from "better-result";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { MpdError } from "./errors";

/** JSON API 向け MPD エラー body（テンプレート） */
export type MpdErrorHttpBody = {
  error: MpdError["_tag"];
  message: string;
};

/** MpdError → HTTP ステータス（境界テンプレート） */
export function mpdErrorHttpStatus(error: MpdError): ContentfulStatusCode {
  switch (error._tag) {
    case "MpcHttpError":
      return error.status === 404 ? 404 : 502;
    case "MpdInvalidArgumentError":
      return 400;
    case "MpdAckError":
    case "MpdInvalidResponseError":
    case "MpdTransportError":
      return 502;
    default:
      return 502;
  }
}

export function mpdErrorHttpBody(error: MpdError): MpdErrorHttpBody {
  return { error: error._tag, message: error.message };
}

/** JSON ルート: Result.err → `{ error, message }` + status */
export function respondMpdJsonError(c: Context, error: MpdError) {
  return c.json(mpdErrorHttpBody(error), mpdErrorHttpStatus(error));
}

/** テキスト / リダイレクト前ルート: Result.err → message + status */
export function respondMpdTextError(c: Context, error: MpdError) {
  return c.text(error.message, mpdErrorHttpStatus(error));
}

/**
 * HTML/Inertia ルート: `undefined` は 404、インフラ障害は 502。
 * 存在確認付き GET/PATCH のテンプレート。
 */
export function matchMpdResourceOrHttp<T>(
  c: Context,
  result: Result<T | undefined, MpdError>,
  onFound: (value: T) => Response | Promise<Response>,
): Response | Promise<Response> {
  return result.match({
    ok: (value) =>
      value !== undefined ? onFound(value) : c.notFound(),
    err: (error) => respondMpdTextError(c, error),
  });
}
