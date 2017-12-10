// node modules
import Bcrypt from 'bcrypt';

// src files
import * as dialogue from '../dialogue';
import * as db from '../database';
import * as security from '../security';
import * as emit from '../emit';
import * as userManagement from '../user_management';
import * as ephemeral from '../ephemeral_password';
import * as tokenManagement from '../token';
import * as socket from '../socket';

function create(client, msg) {
  if (!msg.login || !msg.email || !msg.icon) {
    return emit.reject('user.create', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'admin')
    .then(() => {
      security
        .passwordGenerator()
        .then((password) => {
          const hashedPassword = Bcrypt.hashSync(password, 10);
          db.user
            .create({
              login: msg.login,
              email: msg.email,
              icon: msg.icon,
              password: hashedPassword,
            })
            .then((usr) => {
              ephemeral
                .addUser(usr.login)
                .then((pass) => {
                  const obj = { password: pass };
                  const post = `new user : ${usr.login}`;
                  return emit.resolveWithData('user.create', client, '200', post, obj);
                })
                .catch(() => emit.reject('user.create', client, '500', 'server error'));
            })
            /*
            .then((user) => {
              Fs.mkdir(`/home/git/.gitolite/keydir/${user.userID}`, (err) => {
                if (err) { return emit.reject('user.create', client, '500', err); }
                return emit.resolve('user.create', client, '200', `new user : ${msg.login}`);
              });
            })
            */
            .catch((err) => {
              if (err.errors && err.errors[0] && err.errors[0].message) {
                return emit.reject('user.create', client, '403', err.errors[0].message);
              }
              return emit.reject('user.create', client, '500', err);
            });
        })
        .catch(err => emit.reject('user.create', client, '500', err));
    })
    .catch(err => emit.reject('user.create', client, '401', err));
}

function Delete(client, msg) {
  if (!msg.login) {
    return emit.reject('user.delete', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'superadmin')
    .then(() => {
      db.user
        .findOne({ where: { login: msg.login } })
        .then((user) => {
          if (!user) { return emit.reject('user.delete', client, '404', 'user not found'); }
          if (user.type === 'superadmin') {
            return emit.reject('user.delete', client, '401', 'superadmin can\t be deleted');
          }
          db.contact
            .destroy({
              where: { [db.Or]: [{ user_id: user.id }, { contact_id: user.id }] },
            })
            .then(() => {
              db.device
                .destroy({ where: { user_id: user.id } })
                .then(() => {
                  db.repoMember
                    .destroy({ where: { user_id: user.id } })
                    .then(() => {
                      db.repo
                        .destroy({ where: { host: user.id } })
                        .then(() => {
                          user
                            .destroy()
                            .then(() => {
                              emit.resolve('user.delete', client, '200', `user deleted : ${user.login}`);
                              return userManagement.disconnectUser(user.id);
                            })
                            .catch(err => emit.reject('user.delete', client, '500', err));
                        })
                        .catch(err => emit.reject('user.delete', client, '500', err));
                    })
                    .catch(err => emit.reject('user.delete', client, '500', err));
                })
                .catch(err => emit.reject('user.delete', client, '500', err));
            })
            .catch(err => emit.reject('user.delete', client, '500', err));
        })
        .catch(err => emit.reject('user.delete', client, '500', err));
    })
    .catch(err => emit.reject('user.delete', client, '401', err));
}

function connect(client, msg) {
  if (!msg.email || !msg.password || (msg.token !== true && msg.token !== false) ||
      !msg.sessionId || !msg.sessionName || !msg.sessionType) {
    return emit.reject('user.connect', client, '400', 'invalid parameters');
  }

  db.user
    .findOne({ where: { email: msg.email } })
    .then((user) => {
      if (!user) { return emit.reject('user.connect', client, '404', 'user not found'); }
      security
        .authenticate(msg, user)
        .then((Token) => {
          db.device
            .findOrCreate({
              where: { session: msg.sessionId, user_id: user.id },
              defaults: {
                name: msg.sessionName,
                session: msg.sessionId,
                type: msg.sessionType,
                user_id: user.id,
              },
            })
            .then(() => {
              db.device
                .destroy({ where: { type: 'web' } })
                .then(() => {
                  userManagement
                    .newConnectedUser(client, user, msg)
                    .then(() => {
                      if (user.authenticate === false) {
                        return emit.resolve('user.connect', client, '202', `user connected : ${msg.login}`);
                      }
                      if (!Token) {
                        return emit.resolve('user.connect', client, '200', `user connected : ${msg.login}`);
                      }
                      const obj = { token: Token };
                      const post = `user connected : ${user.login}`;
                      return emit.resolveWithData('user.connect', client, '200', post, obj);
                    })
                    .catch(err => emit.reject('user.connect', client, '500', err));
                })
                .catch(err => emit.reject('user.connect', client, '500', err));
            })
            .catch(err => emit.reject('user.connect', client, '500', err));
        })
        .catch((err) => {
          if (err.message === '400') {
            emit.reject('user.connect', client, '403', 'incorrect password');
            return socket.closeOneSocket(client);
          }
          emit.reject('user.connect', client, '500', err);
          return socket.closeOneSocket(client);
        });
    })
    .catch(err => emit.reject('user.connect', client, '500', err));
}

function disconnect(client) {
  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      tokenManagement
        .remove(data.sessionId, data.id)
        .then(() => {
          userManagement
            .disconnectUserWithClientId(client.id)
            .then(() => {
              emit.resolve('user.disconnect', client, '200', `user disconnected : ${data.login}`);
              return socket.closeOneSocket(client);
            })
            .catch(() => {
              emit.reject('user.disconnect', client, '500', 'user not found');
            });
        });
    })
    .catch(err => emit.reject('user.disconnect', client, '401', err));
}

function getData(client) {
  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.user
        .findOne({ where: { id: data.id } })
        .then((user) => {
          const myObj = {
            id: user.id,
            login: user.login,
            type: user.type,
            email: user.email,
            icon: user.icon,
          };
          const post = 'user data returned';
          return emit.resolveWithData('user.getData', client, '200', post, myObj);
        })
        .catch(err => emit.reject('user.getData', client, '500', err));
    })
    .catch(err => emit.reject('user.getData', client, '401', err));
}

function updatePassword(client, msg) {
  if (!msg.password || !msg.newPassword) {
    return emit.reject('user.updatePassword', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      security
        .passwordValidation(msg.newPassword)
        .then(() => {
          db.user
            .findOne({ where: { login: data.login } })
            .then((user) => {
              if (!user) { emit.reject('user.updatePassword', client, '500', 'user not found'); }
              const checkPass = Bcrypt.compareSync(msg.password, user.password);
              if (checkPass === false) { return emit.reject('user.updatePassword', client, '403', 'wrong password'); }
              const hashedPassword = Bcrypt.hashSync(msg.newPassword, 10);
              user
                .updateAttributes({ password: hashedPassword, authenticate: true })
                .then(() => {
                  emit.resolve('user.updatePassword', client, '200', 'password updated');
                  return userManagement.disconnectUser(data.id);
                })
                .catch(err => emit.reject('user.updatePassword', client, '500', err));
            })
            .catch(err => emit.reject('user.updatePassword', client, '500', err));
        })
        .catch(err => emit.reject('user.updatePassword', client, '400', err));
    })
    .catch(err => emit.reject('user.updatePassword', client, '401', err));
}

function updateIcon(client, msg) {
  if (!msg.icon) {
    return emit.reject('user.updateIcon', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      data
        .updateAttributes({ icon: msg.icon })
        .then(() => {
          emit.resolve('user.updateIcon', client, '200', 'icon updated');
        })
        .catch(err => emit.reject('user.updateIcon', client, '500', err));
    })
    .catch(err => emit.reject('user.updateIcon', client, '401', err));
}

function updateLogin(client, msg) {
  if (!msg.login || !msg.data) {
    return emit.reject('user.updateLogin', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'superadmin')
    .then(() => {
      db.user
        .findOne({ where: { login: msg.login } })
        .then((user) => {
          if (!user) { return emit.reject('user.updateLogin', client, '404', 'user not found'); }
          user
            .updateAttributes({ login: msg.data })
            .then(() => {
              userManagement
                .update(user.login, 'login', msg.data)
                .then(() => emit.resolve('user.updateLogin', client, '200', 'login updated'));
            })
            .catch(err => emit.reject('user.updateLogin', client, '500', err));
        })
        .catch(err => emit.reject('user.updateLogin', client, '500', err));
    })
    .catch(err => emit.reject('user.updateLogin', client, '401', err));
}

function updateEmail(client, msg) {
  if (!msg.login || !msg.data) {
    return emit.reject('user.updateEmail', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'superadmin')
    .then(() => {
      db.user
        .findOne({ where: { login: msg.login } })
        .then((user) => {
          if (!user) { return emit.reject('user.updateEmail', client, '404', 'user not found'); }
          user
            .updateAttributes({ email: msg.data })
            .then(() => emit.resolve('user.updateEmail', client, '200', 'login updated'))
            .catch(err => emit.reject('user.updateEmail', client, '500', err));
        })
        .catch(err => emit.reject('user.updateEmail', client, '500', err));
    })
    .catch(err => emit.reject('user.updateEmail', client, '401', err));
}

export default function run(client) {
  client.on('user.create', (msg) => { create(client, dialogue.convert(msg)); });
  client.on('user.delete', (msg) => { Delete(client, dialogue.convert(msg)); });

  client.on('user.connect', (msg) => { connect(client, dialogue.convert(msg)); });
  client.on('user.disconnect', () => { disconnect(client); });

  client.on('user.getData', () => { getData(client); });

  client.on('user.updatePassword', (msg) => { updatePassword(client, dialogue.convert(msg)); });
  client.on('user.updateIcon', (msg) => { updateIcon(client, dialogue.convert(msg)); });
  client.on('user.updateLogin', (msg) => { updateLogin(client, dialogue.convert(msg)); });
  client.on('user.updateEmail', (msg) => { updateEmail(client, dialogue.convert(msg)); });
}
