// src files
import * as dialogue from './dialogue';

function emit(channel, client, code) {
  const message = {};

  message.code = code;

  client.emit(channel, message);
}

function emitWithData(channel, client, code, msg) {
  const message = msg;

  message.code = code;

  client.emit(channel, message);
}

export function resolve(channel, client, code, status) {
  dialogue.debug(client, channel, status);
  emit(channel, client, code);
}

export function resolveWithData(channel, client, code, status, msg) {
  dialogue.debug(client, channel, status);
  emitWithData(channel, client, code, msg);
}

export function reject(channel, client, code, status) {
  dialogue.error(client, channel, status);
  emit(channel, client, code);
}
