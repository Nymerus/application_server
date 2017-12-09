// src files
import * as security from './security';
import * as db from './database';

const passwordList = {};

export function addUser(userLogin) {
  return new Promise((resolve, reject) => {
    db.user
      .findOne({ where: { login: userLogin } })
      .then((user) => {
        if (!user) { reject(); }
        user
          .updateAttributes({ authenticate: false })
          .then(() => {
            const tmpPass = security.passwordGenerator();
            passwordList[userLogin] = tmpPass;
            resolve(tmpPass);
          })
          .catch(() => reject());
      })
      .catch(() => reject());
  });
}

export function delUser(userLogin) {
  return new Promise((resolve, reject) => {
    db.user
      .findOne({ where: { login: userLogin } })
      .then((user) => {
        if (!user) { reject(); }
        user
          .updateAttributes({ authenticate: true })
          .then(() => {
            if (Object.prototype.hasOwnProperty.call(passwordList, userLogin) === true) {
              delete passwordList[userLogin];
            }
            resolve();
          })
          .catch(() => reject());
      })
      .catch(() => reject());
  });
}

export function genList() {
  return new Promise((resolve, reject) => {
    db.user
      .findAll({ where: { authenticate: false } })
      .then((users) => {
        const userNumber = Object.keys(users).length;
        if (userNumber === 0) { resolve(); }
        Object.keys(users).forEach((user, index) => {
          const tmpPass = security.passwordGenerator();
          passwordList[users[user].login] = tmpPass;
          if (index === userNumber - 1) { resolve(); }
        });
      })
      .catch(err => reject(err));
  });
}

export function checkPassword(userLogin, password) {
  return new Promise((resolve, reject) => {
    const userNumber = Object.keys(passwordList).length;
    if (userNumber === 0) { reject(); }
    Object.keys(passwordList).forEach((user, index) => {
      if (user === userLogin) {
        if (passwordList[user] === password) {
          resolve();
        } else {
          reject();
        }
      }
      if (index === userNumber - 1) { reject(); }
    });
  });
}

export function getPass() {
  return (passwordList);
}
