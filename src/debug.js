// node modules
import Bcrypt from 'bcrypt';

// src files
import * as dialogue from './dialogue';
import * as db from './database';

import img from '../img.json';

export function createAdminIfNotExist() {
  return new Promise((resolve, reject) => {
    db.user
      .findOne({ where: { type: 'superadmin' } })
      .then((superadmin) => {
        if (!superadmin) {
          const hashedPassword = Bcrypt.hashSync('test', 10);
          db.user
            .create({
              login: 'superadmin',
              email: 'superadmin@nymerus.com',
              icon: img.default,
              password: hashedPassword,
              type: 'superadmin',
              authenticate: true,
            })
            .then(() => {
              dialogue.server('info', 'debug', 'superadmin created (superadmin@nymerus.com)');
              resolve();
            })
            .catch(err => reject(dialogue.server('error', 'debug', err)));
        } else {
          resolve();
        }
      })
      .catch(err => reject(dialogue.server('error', 'debug', err)));
  });
}

export function tmp() {}
