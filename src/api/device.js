// @flow
// src files
import * as dialogue from '../dialogue';
import * as db from '../database';
import * as security from '../security';
import * as emit from '../emit';

function get(client) {
  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.device
        .findAll({ where: { user_id: data.id } })
        .then((devices) => {
          const len = Object.keys(devices).length;
          if (len === 0) {
            const post = 'devices returned';
            return emit.resolveWithData('device.get', client, '200', post, { devices: [] });
          }
          let i = 0;
          const userDevices = [];
          for (let c = 0; devices[c]; c += 1) {
            const tmp = {
              name: devices[c].name,
              sessionId: devices[c].session,
              type: devices[c].type,
            };
            userDevices.push(tmp);
            i += 1;
            if (i === len) {
              const myObj = {};
              myObj.devices = userDevices;
              const post = 'devices returned';
              return emit.resolveWithData('device.get', client, '200', post, myObj);
            }
          }
        })
        .catch(err => emit.reject('device.get', client, '500', err));
    })
    .catch(err => emit.reject('device.get', client, '401', err));
}

function rename(client, msg) {
  if (!msg.sessionId || !msg.name) {
    return emit.reject('devices.rename', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.device
        .findOne({ where: { session: msg.sessionId, user_id: data.id } })
        .then((device) => {
          if (!device) {
            return emit.reject('device.rename', client, '404', 'not found');
          }
          device
            .updateAttributes({ name: msg.name })
            .then(() => emit.resolve('device.rename', client, '200', 'device renamed'))
            .catch(err => emit.reject('device.rename', client, '500', err));
        })
        .catch(err => emit.reject('device.rename', client, '500', err));
    })
    .catch(err => emit.reject('device.rename', client, '401', err));
}

function remove(client, msg) {
  if (!msg.sessionId) {
    return emit.reject('devices.delete', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.device
        .destroy({ where: { session: msg.sessionId, user_id: data.id } })
        .then(() => emit.resolve('device.delete', client, '200', 'device deleted'))
        .catch(err => emit.reject('device.delete', client, '500', err));
    })
    .catch(err => emit.reject('device.delete', client, '401', err));
}

export default function run(client) {
  client.on('device.get', () => {
    get(client);
  });
  client.on('device.rename', (msg) => {
    rename(client, dialogue.convert(msg));
  });
  client.on('device.delete', (msg) => {
    remove(client, dialogue.convert(msg));
  });
}
