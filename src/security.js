// @flow

// node modules
import GeneratePassword from 'generate-password';
import ValidatePassword from 'validate-password';
import Bcrypt from 'bcrypt';

// src files
import * as userManagement from './user_management';
import * as ephemeral from './ephemeral_password';
import * as tokenManager from './token';

export function passwordValidation(password: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!password) {
      reject(new Error('empty password'));
    }

    if (password.length < 8) {
      reject(new Error('password must be at least 8 characters in length'));
    }
    if (password.length > 64) {
      reject(new Error('password must be at most 64 characters in length'));
    }

    const validator = new ValidatePassword();
    const passwordData = validator.checkPassword(password);

    if (passwordData.isValid === true) {
      resolve();
    } else {
      reject(new Error(passwordData.validationMessage));
    }
  });
}

export function passwordGenerator(): Promise<string> {
  return new Promise((resolve, reject) => {
    const password: string = GeneratePassword.generate({
      length: 10,
      numbers: true,
      symbols: false,
      uppercase: true,
      excludeSimilarCharacters: true,
      strict: true,
    });

    if (!password) {
      reject(new Error('server internal error'));
    }

    resolve(password);
  });
}

export function tokenGenerator(): Promise<string> {
  return new Promise((resolve, reject) => {
    const token: string = GeneratePassword.generate({
      length: 64,
      numbers: true,
      symbols: false,
      uppercase: true,
      excludeSimilarCharacters: true,
      strict: true,
    });

    if (!token) {
      reject(new Error('server internal error'));
    }

    resolve(token);
  });
}

export function checkUserType(clientId: string, type: string): Promise<any> {
  return new Promise((resolve, reject) => {
    userManagement
      .getUserDataFromClientId(clientId)
      .then((user) => {
        if (type === 'basic') {
          resolve(user);
        } else if (type === 'admin' && (user.type === 'admin' || user.type === 'superadmin')) {
          resolve(user);
        } else if (type === 'superadmin' && user.type === 'superadmin') {
          resolve(user);
        } else {
          reject(new Error(`${type} user needed`));
        }
      })
      .catch(() => reject(new Error('user not found')));
  });
}

export function authenticate(msg: any, user: any): Promise<string> {
  return new Promise((resolve, reject) => {
    if (user.authenticate === false) {
      ephemeral
        .checkPassword(user.login, msg.password)
        .then(resolve)
        .catch(() => reject(new Error('400')));
    } else if (msg.token === true) {
      tokenManager
        .check(msg.sessionId, user.id, msg.password)
        .then((userToken) => {
          if (userToken === 0) {
            resolve();
          } else {
            resolve(userToken);
          }
        })
        .catch(() => reject(new Error('400')));
    } else {
      const checkPass = Bcrypt.compareSync(msg.password, user.password);
      if (checkPass === false) {
        reject(new Error('400'));
      } else {
        tokenManager
          .create(msg.sessionId, user.id)
          .then(token => resolve(token))
          .catch(() => reject(new Error('500')));
      }
    }
  });
}
