export interface PostCheckIpsInListResult {
  results: PostCheckIpsInListBodyResult_Item[];
}

export interface PostCheckIpsInListBodyResult_Item {
  ip: string;
  blocklists: string[];
  allowlists: string[];
}
