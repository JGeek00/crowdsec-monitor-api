import { Alert, DecisionAttributes, ParsedMetaData } from "@/models";

export interface GetAlertResponse extends Alert<ParsedMetaData> {
  decisions?: DecisionAttributes[]
}