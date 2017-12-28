// @flow

// node modules
import Winston from 'winston';

// src files
import * as userManagement from './user_management';

// winston stdout logger
Winston.remove(Winston.transports.Console);
Winston.add(Winston.transports.Console, {
  level: 'silly',
  silent: false,
  timestamp: true,
  colorize: true,
  prettyPrint: true,
});

export const winston = Winston;

function emitToAdmins(type, intro, post) {
  const message = { type, intro, post };
  const connected = userManagement.getList();
  const len = Object.keys(connected).length;
  if (len > 0) {
    Object.keys(connected).forEach((user) => {
      if (connected[user].type === 'admin' || connected[user].type === 'superadmin') {
        connected[user].client.emit('admin.logs', message);
      }
    });
  }
}

function getUserData(client: any) {
  return new Promise((resolve, reject) => {
    userManagement
      .getUserDataFromClientId(client.id)
      .then((clientData) => {
        resolve(`\x1b[37m\x1b[1m${clientData.login} on \x1b[36m\x1b[1m${clientData.sessionName}\x1b[0m(${
          clientData.sessionType
        }\x1b[0m)`);
      })
      .catch(() => {
        reject(new Error(`\x1b[37m\x1b[1m[${client.id}]\x1b[0m`));
      });
  });
}

function getColored(type: string, client: string, channel: string): string {
  if (type === 'intro') {
    return `${new Date().toUTCString()} - \x1b[32minfo\x1b[0m: `;
  } else if (type === 'server') {
    return `\x1b[37m\x1b[1m[SERVER]\x1b[0m - \x1b[32m\x1b[1m${channel}\x1b[0m > `;
  } else if (type === 'msg') {
    return `\x1b[37m\x1b[1m${client}\x1b[0m - \x1b[32m\x1b[1m${channel}\x1b[0m > `;
  } else if (type === 'test') {
    return `\x1b[37m\x1b[1m${channel}\x1b[0m > `;
  }
  return '';
}

export function server(type: string, channel: string, post: string) {
  if (type === 'info') {
    Winston.info(getColored('server', '', channel), post);
    emitToAdmins('info', getColored('server', '', channel), post);
  }
  if (type === 'error') {
    Winston.error(getColored('server', '', channel), post);
    emitToAdmins('error', getColored('server', '', channel), post);
  }
}

export function debug(client: any, channel: string, post: string) {
  getUserData(client)
    .then((data) => {
      Winston.debug(getColored('msg', data, channel), post);
      emitToAdmins('debug', getColored('msg', data, channel), post);
    })
    .catch((err) => {
      Winston.debug(getColored('msg', err.message, channel), post);
      emitToAdmins('debug', getColored('msg', err.message, channel), post);
    });
}

export function info(client: any, channel: string, post: string) {
  getUserData(client)
    .then((data) => {
      Winston.info(getColored('msg', data, channel), post);
      emitToAdmins('info', getColored('msg', data, channel), post);
    })
    .catch((err) => {
      Winston.info(getColored('msg', err.message, channel), post);
      emitToAdmins('info', getColored('msg', err.message, channel), post);
    });
}

export function error(client: any, channel: string, post: string) {
  getUserData(client)
    .then((data) => {
      Winston.error(getColored('msg', data, channel), post);
      emitToAdmins('error', getColored('msg', data, channel), post);
    })
    .catch((err) => {
      Winston.error(getColored('msg', err.message, channel), post);
      emitToAdmins('error', getColored('msg', err.message, channel), post);
    });
}

export function test(channel: string, post: string) {
  Winston.info(getColored('test', '', channel), post);
  emitToAdmins('info', getColored('test', '', channel), post);
}

export function convert(msg: string | {}) {
  if (typeof msg === 'string') {
    return JSON.parse(msg);
  }
  return msg;
}
