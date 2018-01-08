// src files
import * as security from '../security';
import * as userManagement from '../user_management';
import * as emit from '../emit';
import * as dialogue from '../dialogue';
import * as db from '../database';

export function toAll(client, msg) {
  if (!msg.post || !msg.code) {
    return emit.reject('notification.toAll', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      userManagement.getClient().then((connectedUsers) => {
        Object.keys(connectedUsers).forEach((user, index) => {
          if (data.session !== connectedUsers[index].session) {
            emit.resolve('notification.toAll', connectedUsers[index].client, msg.code, msg.post);
          }
        });
      });
    })
    .catch(err => emit.reject('notification.toAll', client, '401', err));
}

export function toRepo(client, msg) {
  if (!msg.post || !msg.code || !msg.repoId) {
    return emit.reject('notification.toRepo', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.repoMember
        .findAll({ where: { repo_id: msg.repoId } })
        .then((members) => {
          const memberList = [];
          Object.keys(members).forEach((member, index) => {
            memberList.push(member.user_id);
            if (members.length === index + 1) {
              userManagement.getClient().then((connectedUsers) => {
                Object.keys(connectedUsers).forEach((user, index2) => {
                  if (data.session !== connectedUsers[index2].session && memberList.includes(connectedUsers[index2].id)) {
                    emit.resolve('notification.toRepo', connectedUsers[index2].client, msg.code, msg.post);
                  }
                });
              });
            }
          });
        })
        .catch(err => emit.reject('notification.toRepo', client, '401', err));
    })
    .catch(err => emit.reject('notification.toRepo', client, '401', err));
}

export function toUser(client, msg) {
  if (!msg.post || !msg.code || !msg.userId) {
    return emit.reject('notification.toUser', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      userManagement.getClient().then((connectedUsers) => {
        Object.keys(connectedUsers).forEach((user, index) => {
          if (connectedUsers[index].id === msg.userId && data.session !== connectedUsers[index].session) {
            emit.resolve('notification.toUser', connectedUsers[index].client, msg.code, msg.post);
          }
        });
      });
    })
    .catch(err => emit.reject('notification.toUser', client, '401', err));
}

export default function run(client) {
  client.on('notification.toAll', (msg) => {
    toAll(client, dialogue.convert(msg));
  });
  client.on('notification.toRepo', (msg) => {
    toRepo(client, dialogue.convert(msg));
  });
  client.on('notification.toUser', (msg) => {
    toUser(client, dialogue.convert(msg));
  });
}
