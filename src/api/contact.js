// @flow
// src files
import * as dialogue from '../dialogue';
import * as db from '../database';
import * as security from '../security';
import * as emit from '../emit';
import * as userManagement from '../user_management';

function add(client, msg) {
  if (!msg.login) {
    return emit.reject('contact.add', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      if (msg.login === data.login) {
        return emit.reject('contact.add', client, '400', 'invalid parameters');
      }
      db.user
        .findOne({ where: { login: msg.login } })
        .then((contact) => {
          if (!contact) {
            return emit.reject('contact.add', client, '404', 'contact not found');
          }
          db.contact
            .findOrCreate({
              where: {
                user_id: data.id,
                contact_id: contact.id,
              },
            })
            .then(() => emit.resolve('contact.add', client, '200', 'contact added'))
            .catch(err => emit.reject('contact.add', client, '500', err));
        })
        .catch(err => emit.reject('contact.add', client, '500', err));
    })
    .catch(err => emit.reject('contact.add', client, '401', err));
}

function remove(client, msg) {
  if (!msg.login) {
    return emit.reject('contact.delete', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.user
        .findOne({ where: { login: msg.login } })
        .then((contact) => {
          if (!contact) {
            return emit.reject('contact.delete', client, '404', 'contact not found');
          }
          db.contact
            .destroy({
              where: {
                user_id: data.id,
                contact_id: contact.id,
              },
            })
            .then(() => emit.resolve('contact.delete', client, '200', 'contact deleted'))
            .catch(err => emit.reject('contact.delete', client, '500', err));
        })
        .catch(err => emit.reject('contact.delete', client, '500', err));
    })
    .catch(err => emit.reject('contact.delete', client, '401', err));
}

function profile(client, msg) {
  if (!msg.login) {
    return emit.reject('contact.profile', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      if (msg.login === data.login) {
        return emit.reject('contact.profile', client, '400', 'invalid parameters');
      }
      db.user
        .findOne({ where: { login: msg.login } })
        .then((contact) => {
          if (!contact) {
            return emit.reject('contact.profile', client, '404', 'contact not found');
          }
          const myObj = {
            id: contact.id,
            login: contact.login,
            email: contact.email,
            type: contact.type,
            icon: contact.icon,
          };
          const post = 'profile returned';
          return emit.resolveWithData('contact.profile', client, '200', post, myObj);
        })
        .catch(err => emit.reject('contact.profile', client, '500', err));
    })
    .catch(err => emit.reject('contact.profile', client, '401', err));
}

function get(client) {
  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.contact
        .findAll({ where: { user_id: data.id } })
        .then((contacts) => {
          const len = Object.keys(contacts).length;
          if (len === 0) {
            const myObj = {};
            myObj.contacts = [];
            const post = 'contacts returned';
            return emit.resolveWithData('contact.get', client, '200', post, myObj);
          }
          let i = 0;
          const userContacts = [];
          for (let c = 0; contacts[c]; c += 1) {
            db.user
              .findOne({ where: { id: contacts[c].contact_id } })
              .then((contact) => {
                const tmp = {
                  login: contact.login,
                };
                userManagement
                  .connected(contact.login)
                  .then(() => {
                    tmp.connected = true;
                    userContacts.push(tmp);
                    i += 1;
                    if (i === len) {
                      const myObj = {};
                      myObj.contacts = userContacts;
                      const post = 'contacts returned';
                      return emit.resolveWithData('contact.get', client, '200', post, myObj);
                    }
                  })
                  .catch(() => {
                    tmp.connected = false;
                    userContacts.push(tmp);
                    i += 1;
                    if (i === len) {
                      const myObj = {};
                      myObj.contacts = userContacts;
                      const post = 'contacts returned';
                      return emit.resolveWithData('contact.get', client, '200', post, myObj);
                    }
                  });
              })
              .catch(err => emit.reject('contact.get', client, '500', err));
          }
        })
        .catch(err => emit.reject('contact.get', client, '500', err));
    })
    .catch(err => emit.reject('contact.get', client, '401', err));
}

function isAContact(userId, contactId) {
  return new Promise((resolve, reject) => {
    db.contact
      .findOne({ where: { user_id: userId, contact_id: contactId } })
      .then((res) => { if (res) { resolve(); } else { reject(); } })
      .catch(() => reject());
  });
}

function search(client, msg) {
  if (!msg.value) {
    return emit.reject('contact.search', client, '400', 'invalid parameters');
  }

  let myVal = '';
  if (msg.value === '*') {
    myVal = '%';
  } else {
    myVal = `%${msg.value}%`;
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.user
        .findAll({ where: { login: { [db.Like]: myVal } } })
        .then((contacts) => {
          const len = Object.keys(contacts).length;
          if (len === 0) {
            const myObj = {};
            myObj.contacts = [];
            const post = 'contacts returned';
            return emit.resolveWithData('contact.search', client, '200', post, myObj);
          }
          let i = 0;
          const userContacts = [];
          for (let c = 0; contacts[c]; c += 1) {
            db.user
              .findOne({ where: { id: contacts[c].id } })
              .then((contact) => {
                if (data.login !== contact.login) {
                  const tmp = {
                    id: contact.id,
                    login: contact.login,
                    connected: false,
                  };
                  userManagement.connected(contact.login).then(() => { tmp.connected = true; });
                  isAContact(data.id, contact.id).then(() => { tmp.contact = true; }).catch(() => { tmp.contact = false; });
                  userContacts.push(tmp);
                }
                i += 1;
                if (i === len) {
                  const myObj = {};
                  myObj.contacts = userContacts;
                  const post = 'contacts returned';
                  return emit.resolveWithData('contact.search', client, '200', post, myObj);
                }
              })
              .catch(err => emit.reject('contact.search', client, '500', err));
          }
        })
        .catch(err => emit.reject('contact.search', client, '500', err));
    })
    .catch(err => emit.reject('contact.get', client, '401', err));
}

export default function run(client) {
  client.on('contact.add', (msg) => {
    add(client, dialogue.convert(msg));
  });
  client.on('contact.delete', (msg) => {
    remove(client, dialogue.convert(msg));
  });

  client.on('contact.profile', (msg) => {
    profile(client, dialogue.convert(msg));
  });
  client.on('contact.get', () => {
    get(client);
  });

  client.on('contact.search', (msg) => {
    search(client, dialogue.convert(msg));
  });
}
