// src files
import * as socket from './socket';
import * as tokenManagement from './token';

const connectedUsers = {};

export function getList() {
  return connectedUsers;
}

export function get() {
  return new Promise((resolve) => {
    const userNumber = Object.keys(connectedUsers).length;
    const uConnected = [];
    if (userNumber === 0) { resolve(uConnected); }
    Object.keys(connectedUsers).forEach((user, index) => {
      const tmp = {
        id: connectedUsers[user].id,
        type: connectedUsers[user].type,
        login: connectedUsers[user].login,
        session: connectedUsers[user].session,
      };
      uConnected.push(tmp);
      if (index === userNumber - 1) { resolve(uConnected); }
    });
  });
}

export function getClient() {
  return new Promise((resolve) => {
    const userNumber = Object.keys(connectedUsers).length;
    const uConnected = [];
    if (userNumber === 0) { resolve(uConnected); }
    Object.keys(connectedUsers).forEach((user, index) => {
      const tmp = {
        id: connectedUsers[user].id,
        session: connectedUsers[user].sessionId,
        client: connectedUsers[user].client,
      };
      uConnected.push(tmp);
      if (index === userNumber - 1) { resolve(uConnected); }
    });
  });
}

export function getUserDataFromClientId(clientId) {
  return new Promise((resolve, reject) => {
    const userNumber = Object.keys(connectedUsers).length;
    if (userNumber === 0) { reject(); }
    Object.keys(connectedUsers).forEach((user, index) => {
      if (connectedUsers[user].client.id === clientId) {
        resolve(connectedUsers[user]);
      }
      if (index === userNumber - 1) { reject(); }
    });
  });
}

export function newConnectedUser(userClient, user, msg) {
  return new Promise((resolve) => {
    if (Object.prototype.hasOwnProperty.call(connectedUsers, msg.sessionId) === true) {
      if (socket.closeOneSocket(userClient) === true) {
        delete connectedUsers[msg.sessionId];
        resolve();
      } else {
        delete connectedUsers[msg.sessionId];
        resolve();
      }
    }

    connectedUsers[msg.sessionId] = {
      id: user.id,
      type: user.type,
      login: user.login,
      sessionName: msg.sessionName,
      sessionType: msg.sessionType,
      sessionId: msg.sessionId,
      client: userClient,
    };
    resolve();
  });
}

export function disconnectUserWithClientId(clientId) {
  return new Promise((resolve, reject) => {
    const userNumber = Object.keys(connectedUsers).length;
    Object.keys(connectedUsers).forEach((user, index) => {
      if (connectedUsers[user].client.id === clientId) {
        delete connectedUsers[user];
        resolve();
      }
      if (index === userNumber - 1) { reject(); }
    });
  });
}

export function notConnected(sessionId) {
  return new Promise((resolve, reject) => {
    const userNumber = Object.keys(connectedUsers).length;
    if (userNumber === 0) { resolve(); }
    Object.keys(connectedUsers).forEach((user, index) => {
      if (user === sessionId) { reject(connectedUsers[user].client.id); }
      if (index === userNumber - 1) { resolve(); }
    });
  });
}

export function connected(login) {
  return new Promise((resolve, reject) => {
    const userNumber = Object.keys(connectedUsers).length;
    if (userNumber === 0) { reject(); }
    Object.keys(connectedUsers).forEach((user, index) => {
      if (connectedUsers[user].login === login) { resolve(); }
      if (index === userNumber - 1) { reject(); }
    });
  });
}

export function disconnectUser(userId) {
  return new Promise((resolve, reject) => {
    tokenManagement
      .removeAll(userId)
      .then(() => {
        const userNumber = Object.keys(connectedUsers).length;
        Object.keys(connectedUsers).forEach((user, index) => {
          if (connectedUsers[user].id === userId) {
            socket.closeOneSocket(connectedUsers[user].client);
            delete connectedUsers[user];
          }
          if (index === userNumber - 1) {
            resolve();
          }
        });
      })
      .catch(() => { reject(); });
  });
}

export function update(login, name, data) {
  return new Promise((resolve) => {
    const userNumber = Object.keys(connectedUsers).length;
    if (userNumber === 0) { resolve(); }
    Object.keys(connectedUsers).forEach((user, index) => {
      if (connectedUsers[user].login === login) {
        connectedUsers[user][name] = data;
      }
      if (index === userNumber - 1) { resolve(); }
    });
  });
}
