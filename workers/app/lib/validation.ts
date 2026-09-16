import * as v from "valibot";

import type { StandardSchemaV1 } from "@standard-schema/spec";
import { queueSongInputSchema, type QueueFormErrors, type QueueSongInput } from "../schemas/queue";
import {
  emptyFormErrors,
  type StandardPathSegment,
  toFieldErrorsFromIssues,
} from "./validation/form-errors";

type RawQueueForm = v.InferInput<typeof queueSongInputSchema>;

const queueFileKeySchema = v.object({ key: v.literal("file") });

function fieldKey(last: StandardPathSegment | undefined): keyof QueueSongInput | null {
  if (last === undefined) return null;

  if (last === "file") return "file";

  if (v.safeParse(queueFileKeySchema, last).success) return "file";

  return null;
}

export const emptyQueueFormErrors = emptyFormErrors<QueueSongInput>();

export const toFieldErrors = (issues: readonly StandardSchemaV1.Issue[]): QueueFormErrors =>
  toFieldErrorsFromIssues<QueueSongInput>(issues, fieldKey);

export const recoverInput = (rawQueueForm: RawQueueForm): QueueSongInput => {
  const file = v.safeParse(v.string(), rawQueueForm.file);

  return { file: file.success ? file.output : "" };
};
