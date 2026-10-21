import axios from 'axios';
import { PROCESS_ERRORS } from '@/constants/process-errors';
import { log } from '@/infrastructure/system/logger';
import type { BlocklistSource as BlocklistSourcePort } from '@/application/ports/blocklist-source.port';

/** Downloads blocklist files over HTTP (the `fetch` stage input of the refresh pipeline). */
export class HttpBlocklistSource implements BlocklistSourcePort {
  async download(url: string): Promise<string> {
    const response = await axios
      .get<string>(url, {
        responseType: 'text',
        timeout: 30000,
      })
      .catch(() => {
        throw new Error(PROCESS_ERRORS.blocklistImport.fetchFailed);
      });

    log.debug(`  Fetched blocklist: ${response.data.length} bytes`);
    return response.data;
  }
}
