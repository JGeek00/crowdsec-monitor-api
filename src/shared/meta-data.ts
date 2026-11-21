export type MetaData = UnparsedMetaData | ParsedMetaData;

export interface UnparsedMetaData {
  key: string;
  // WAF events can omit value (ej. {"key":"data"})
  value?: string;
}

export interface ParsedMetaData {
  key: string;
  value: string[];
}
