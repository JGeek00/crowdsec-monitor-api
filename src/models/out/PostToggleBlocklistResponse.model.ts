import { Blocklist, ResponseWithError } from "@/models";

interface PostToggleBlocklistResponseBody {
  data: Blocklist;
}

export type PostToggleBlocklistResponse = ResponseWithError<PostToggleBlocklistResponseBody>;