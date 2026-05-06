import { Alert, Decision, ParsedMetaData } from "@/models";

export interface GetAlertResponse extends Alert<ParsedMetaData> {
  decisions?: Decision[]
}