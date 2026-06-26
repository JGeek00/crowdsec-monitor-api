export type MetaData = UnparsedMetaData | ParsedMetaData;

export interface UnparsedMetaData {
  key: string;
  value: string;
}

export interface ParsedMetaData {
  key: string;
  value: string[];
}
