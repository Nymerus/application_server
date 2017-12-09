// src files
import * as dialogue from './dialogue';

import user from './api/user';
import contact from './api/contact';
import device from './api/device';
import repo from './api/repo';
import admin from './api/admin';

export function api(client) {
  user(client);
  contact(client);
  device(client);
  repo(client);
  admin(client);
}

export function errors(client) {
  client.on('connect_error', (error) => {
    dialogue.server('error', 'routes', `connect_error : ${error}`);
  });
  client.on('error', (error) => {
    dialogue.server('error', 'routes', `error : ${error}`);
  });
  client.on('ping', () => {
    dialogue.server('info', 'routes', 'ping request received');
    client.emit('pong');
  });
}
