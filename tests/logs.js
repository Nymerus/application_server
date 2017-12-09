#!/usr/bin/env node

// node modules
import SocketIO from 'socket.io-client';

// src files
import config from '../package.json';
import * as dialogue from '../src/dialogue';

const socket = SocketIO(`${config.nymerus.address}:${config.nymerus.port}`);

socket.on('user.connect', (data) => { dialogue.test('user.connect', data); });
socket.on('admin.logs', (data) => { dialogue.winston[data.type](data.intro, data.post); });

setTimeout(() => {
  socket.emit('user.connect', {
    email: 'superadmin@nymerus.com',
    password: 'test',
    token: false,
    sessionId: 'logs-Mac',
    sessionName: 'session de logs',
    sessionType: 'test',
  });
}, 1000);
