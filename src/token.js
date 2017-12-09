// src files
import * as security from './security';

const tokenList = {};

function findAndDelete(sessionId, userId) {
  return new Promise((resolve) => {
    const userNumber = Object.keys(tokenList).length;
    if (userNumber === 0) { resolve(); }
    Object.keys(tokenList).forEach((user, index) => {
      if (tokenList[user].sessionId === sessionId && tokenList[user].userId === userId) {
        delete tokenList[user];
        resolve();
      }
      if (index === userNumber - 1) { resolve(); }
    });
  });
}

export function create(sessionID, userID) {
  return new Promise((resolve, reject) => {
    security
      .tokenGenerator()
      .then((token) => {
        findAndDelete(sessionID, userID)
          .then(() => {
            tokenList[token] = {
              sessionId: sessionID,
              userId: userID,
              expiration: new Date(new Date().getTime() + (2 * 86400000)),
            };
            resolve(token);
          });
      })
      .catch(err => reject(err));
  });
}

export function check(sessionID, userID, token) {
  return new Promise((resolve, reject) => {
    const userNumber = Object.keys(tokenList).length;
    if (userNumber === 0) { reject(); }
    Object.keys(tokenList).forEach((user, index) => {
      if (tokenList[user].sessionId === sessionID && tokenList[user].userId === userID) {
        if (user !== token) { reject(); }
        const dateNow = new Date();
        const expireLessOne = new Date(tokenList[user].expiration.getTime() - (1 * 86400000));
        if (dateNow < tokenList[user].expiration && dateNow < expireLessOne) {
          resolve(0);
        } else if (dateNow < tokenList[user].expiration && dateNow > expireLessOne) {
          if (user !== token) { reject(); }
          create(sessionID, userID)
            .then(newToken => resolve(newToken))
            .catch(err => reject(err));
        } else {
          findAndDelete(sessionID, userID)
            .then(() => reject());
        }
      }
      if (index === userNumber - 1) { reject(); }
    });
  });
}

export function remove(sessionID, userID) {
  return new Promise((resolve) => {
    const userNumber = Object.keys(tokenList).length;
    if (userNumber === 0) { resolve(); }
    Object.keys(tokenList).forEach((user, index) => {
      if (tokenList[user].sessionId === sessionID && tokenList[user].userId === userID) {
        delete tokenList[user];
        resolve();
      }
      if (index === userNumber - 1) { resolve(); }
    });
  });
}

export function removeAll(userID) {
  return new Promise((resolve) => {
    const userNumber = Object.keys(tokenList).length;
    if (userNumber === 0) { resolve(); }
    Object.keys(tokenList).forEach((user, index) => {
      if (tokenList[user].userId === userID) {
        delete tokenList[user];
      }
      if (index === userNumber - 1) { resolve(); }
    });
  });
}
