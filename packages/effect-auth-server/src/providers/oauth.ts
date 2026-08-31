import { Effect, type Schema } from "effect";
import {
  type Headers,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  Url,
  UrlParams,
} from "effect/unstable/http";

export const authorizationUrl = (endpoint: string, params: UrlParams.Input) =>
  Effect.fromResult(Url.fromString(endpoint)).pipe(
    Effect.map((url) => Url.setUrlParams(url, UrlParams.fromInput(params))),
  );

export const postFormJson = <S extends Schema.Constraint>(
  url: string,
  params: UrlParams.Input,
  schema: S,
) =>
  HttpClient.execute(
    HttpClientRequest.post(url).pipe(
      HttpClientRequest.acceptJson,
      HttpClientRequest.bodyUrlParams(params),
    ),
  ).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
  );

export const getJson = <S extends Schema.Constraint>(
  url: string,
  headers: Headers.Input,
  schema: S,
) =>
  HttpClient.get(url, { acceptJson: true, headers }).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
  );
