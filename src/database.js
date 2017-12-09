// node modules
import Sequelize from 'sequelize';
import Fs from 'fs';

// src files
import * as dialogue from './dialogue';
import * as socket from './socket';
import * as ephemeral from './ephemeral_password';
import * as debug from './debug';

// create folder database if doesn't exist
if (!Fs.existsSync('database')) { Fs.mkdirSync('database'); }

const database = new Sequelize('nymerus.sqlite', '', '', {
  dialect: 'sqlite',
  storage: './database/nymerus.sqlite',
  logging: false,
  operatorsAliases: false,
});

export const user = database.import('./models/user.js');
export const contact = database.import('./models/contact.js');
export const device = database.import('./models/device.js');
export const repo = database.import('./models/repo.js');
export const repoMember = database.import('./models/repo_member.js');
export const Or = Sequelize.Op.or;
export const Like = Sequelize.Op.like;

database.sync();

export function run() {
  database
    .authenticate()
    .then(() => {
      ephemeral
        .genList()
        .then(() => {
          debug
            .createAdminIfNotExist()
            .then(() => {
              socket.run();
              dialogue.server('info', 'database', 'server started');
            })
            .catch((err) => {
              dialogue.server('error', 'database', err);
            });
        })
        .catch(() => {
          dialogue.server('error', 'database', 'unable to create tpm passwords');
        });
    })
    .catch((err) => {
      dialogue.server('error', 'database', `unable to start the database : ${err}`);
    });
}
