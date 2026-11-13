import { RetrospectiveConflict, RetrospectiveTimeError } from "../../../../lib/retrospective-workout";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getRawDb } from "../../../../db/raw";
import { careConfig } from "../../../../lib/care-server";
import { privateJson } from "../../../../lib/private-json";
import { apiError, readPayload } from "../../../../lib/api-helpers";
import { retrospectiveWorkoutStore } from "../../../../lib/retrospective-workout-store";
async function handle(
  request: Request,
  action: "load" | "saveDraft" | "submit" | "correct",
) {
  const user = await getChatGPTUser();
  if (!user)
    return privateJson({ error: "יש להתחבר כדי לתעד אימון." }, { status: 401 });
  try {
    const store = retrospectiveWorkoutStore(getRawDb(), careConfig());
    const result =
      action === "load"
        ? new URL(request.url).searchParams.has("session")
          ? await store.loadEntry(user.userId, new URL(request.url).searchParams.get("session")!)
          : await store.load(user.userId)
        : action === "correct"
          ? await store.correct(user.userId, await readPayload(request, 200000))
        : action === "saveDraft"
          ? await store.saveDraft(
              user.userId,
              await readPayload(request, 200000),
            )
          : await store.submit(user.userId, await readPayload(request, 200000));
    return privateJson(result);
  } catch (error) {
    if (error instanceof RetrospectiveConflict || error instanceof RetrospectiveTimeError)
      return privateJson(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    return apiError(error);
  }
}
export const GET = (request: Request) => handle(request, "load");
export const PUT = (request: Request) => handle(request, "saveDraft");
export const POST = (request: Request) => handle(request, "submit");
export const PATCH = (request: Request) => handle(request, "correct");
