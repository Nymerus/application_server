// @flow
// src files
import * as dialogue from '../dialogue';
import * as db from '../database';
import * as security from '../security';
import * as emit from '../emit';
import * as userManagement from '../user_management';
import * as ephemeral from '../ephemeral_password';

function upgrade(client, msg) {
  if (!msg.login || !msg.type) {
    return emit.reject('admin.upgrade', client, '400', 'invalid parameters');
  }
  if (msg.type !== 'basic' && msg.type !== 'admin') {
    return emit.reject('admin.upgrade', client, '400', 'type will be basic or admin');
  }

  security
    .checkUserType(client.id, 'superadmin')
    .then((data) => {
      db.user
        .findOne({ where: { login: msg.login } })
        .then((user) => {
          if (!user) {
            return emit.reject('admin.upgrade', client, '400', 'user not found');
          }
          if (user.id === data.id) {
            return emit.reject('admin.upgrade', client, '400', "can't upgrade superadmin");
          }
          user
            .updateAttributes({ type: msg.type })
            .then(() => {
              emit.resolve('user.upgrade', client, '200', 'user upgraded');
              return userManagement.disconnectUser(user.id);
            })
            .catch(err => emit.reject('admin.upgrade', client, '500', err));
        })
        .catch(err => emit.reject('admin.upgrade', client, '500', err));
    })
    .catch(err => emit.reject('admin.upgrade', client, '401', err));
}

function connected(client) {
  security
    .checkUserType(client.id, 'admin')
    .then(() => {
      userManagement.get().then((connectedUsers) => {
        const myObj = {};
        myObj.connectedUsers = connectedUsers;
        const post = 'connected users returned';
        return emit.resolveWithData('admin.connected', client, '200', post, myObj);
      });
    })
    .catch(err => emit.reject('admin.connected', client, '401', err));
}

function getPasswords(client) {
  security
    .checkUserType(client.id, 'superadmin')
    .then(() => {
      const myObj = {};
      const pass = ephemeral.getPass();
      myObj.passwords = pass;
      const post = 'temp passwords returned';
      return emit.resolveWithData('admin.getPasswords', client, '200', post, myObj);
    })
    .catch(err => emit.reject('admin.getPasswords', client, '401', err));
}

export default function run(client) {
  client.on('admin.upgrade', (msg) => {
    upgrade(client, dialogue.convert(msg));
  });
  client.on('admin.connected', () => {
    connected(client);
  });
  client.on('admin.getPasswords', () => {
    getPasswords(client);
  });
}
