import { TaggedError } from "better-result";

export class MpcHttpError extends TaggedError("MpcHttpError")<{
  status: number;
  url: string;
  message: string;
}>() {
  constructor(args: { status: number; url: string }) {
    super({
      ...args,
      message: `mpc http ${args.status} from ${args.url}`,
    });
  }
}

export class MpdInvalidResponseError extends TaggedError(
  "MpdInvalidResponseError",
)<{
  url: string;
  preview: string;
  message: string;
}>() {
  constructor(args: { url: string; preview: string }) {
    super({
      ...args,
      message: `invalid mpd response: ${args.preview}`,
    });
  }
}

export class MpdAckError extends TaggedError("MpdAckError")<{
  cmd: string;
  preview: string;
  message: string;
}>() {
  constructor(args: { cmd: string; preview: string }) {
    super({
      ...args,
      message: `mpd ACK for ${args.cmd}: ${args.preview}`,
    });
  }
}

export class MpdTransportError extends TaggedError("MpdTransportError")<{
  message: string;
  cause?: unknown;
}>() {}

export type MpdError =
  | MpcHttpError
  | MpdInvalidResponseError
  | MpdAckError
  | MpdTransportError;

const isMpdError = (cause: unknown): cause is MpdError =>
  MpcHttpError.is(cause) ||
  MpdInvalidResponseError.is(cause) ||
  MpdAckError.is(cause) ||
  MpdTransportError.is(cause);

export function mpdErrorFromUnknown(cause: unknown): MpdError {
  if (isMpdError(cause)) return cause;
  const message = cause instanceof Error ? cause.message : String(cause);
  return new MpdTransportError({ message, cause });
}
