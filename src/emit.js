// @flow
// src files
import * as dialogue from "./dialogue";

type Client = {
  emit: (string, any) => any,
  on: (string, (any) => any) => any,
  id: string
};

function emit(channel: string, client: Client, code: string) {
  client.emit(channel, { code });
}

function emitWithData(channel: string, client: Client, code: string, msg: {}) {
  client.emit(channel, { data: msg, code });
}

export function resolve(
  channel: string,
  client: Client,
  code: string,
  status: any
) {
  dialogue.debug(client, channel, status);
  emit(channel, client, code);
}

export function resolveWithData(
  channel: string,
  client: Client,
  code: string,
  status: any,
  msg: {}
) {
  dialogue.debug(client, channel, status);
  emitWithData(channel, client, code, msg);
}

export function reject(
  channel: string,
  client: Client,
  code: string,
  status: any
) {
  dialogue.error(client, channel, status);
  emit(channel, client, code);
}
