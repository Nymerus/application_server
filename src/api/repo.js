// src files
import * as dialogue from '../dialogue';
import * as db from '../database';
import * as security from '../security';
import * as emit from '../emit';

function create(client, msg) {
  if (!msg.name || !msg.path) {
    return emit.reject('repo.create', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.repo
        .findOne({ where: { name: msg.name, host: data.id } })
        .then((repo) => {
          if (repo) {
            return emit.reject('repo.create', client, '400', 'repo name already used');
          }
          db.repo
            .create({ name: msg.name, host: data.id, default_path: msg.path })
            .then((newRepo) => {
              db.repoMember
                .create({ user_id: data.id, repo_id: newRepo.id, role: 'host' })
                .then(() => {
                  // create git repo here
                  emit.resolve('repo.create', client, '200', 'repo created');
                })
                .catch(err => emit.reject('repo.create', client, '500', err));
            })
            .catch(err => emit.reject('repo.create', client, '500', err));
        })
        .catch(err => emit.reject('repo.create', client, '500', err));
    })
    .catch(err => emit.reject('repo.create', client, '401', err));
}

function remove(client, msg) {
  if (!msg.name) {
    return emit.reject('repo.delete', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.repo
        .findOne({ where: { name: msg.name, host: data.id } })
        .then((repo) => {
          if (!repo) {
            return emit.reject('repo.delete', client, '400', 'can\'t find repo');
          }
          repo
            .destroy()
            .then(() => {
              db.repoMember
                .destroy({ where: { repo_id: repo.id } })
                .then(() => {
                  // delete git repo here
                  emit.resolve('repo.delete', client, '200', 'repo deleted');
                })
                .catch(err => emit.reject('repo.delete', client, '500', err));
            })
            .catch(err => emit.reject('repo.delete', client, '500', err));
        })
        .catch(err => emit.reject('repo.delete', client, '500', err));
    })
    .catch(err => emit.reject('repo.delete', client, '401', err));
}

function rename(client, msg) {
  if (!msg.name || !msg.newName) {
    return emit.reject('repo.rename', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.repo
        .findOne({ where: { name: msg.name, host: data.id } })
        .then((repo) => {
          if (!repo) {
            return emit.reject('repo.rename', client, '400', 'can\'t find repo');
          }
          db.repo
            .findOne({ where: { name: msg.newName } })
            .then((findedRepo) => {
              if (findedRepo) {
                return emit.reject('repo.rename', client, '400', 'repo name already used');
              }
              repo
                .updateAttributes({ name: msg.newName })
                .then(() => emit.resolve('repo.rename', client, '200', 'repo renamed'))
                .catch(err => emit.reject('repo.rename', client, '500', err));
            })
            .catch(err => emit.reject('repo.rename', client, '500', err));
        })
        .catch(err => emit.reject('repo.rename', client, '500', err));
    })
    .catch(err => emit.reject('repo.rename', client, '401', err));
}

function get(client) {
  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.repoMember
        .findAll({ where: { user_id: data.id } })
        .then((repoList) => {
          const len = Object.keys(repoList).length;
          if (len === 0) {
            const myObj = {};
            myObj.repos = [];
            const post = 'repos returned';
            return emit.resolveWithData('repo.get', client, '200', post, myObj);
          }
          let i = 0;
          const userRepos = [];
          for (let c = 0; repoList[c]; c += 1) {
            db.repo
              .findOne({ where: { id: repoList[c].repo_id } })
              .then((repo) => {
                const tmp = {
                  name: repo.name,
                };
                userRepos.push(tmp);
                i += 1;
                if (i === len) {
                  const myObj = {};
                  myObj.repos = userRepos;
                  const post = 'repos returned';
                  return emit.resolveWithData('repo.get', client, '200', post, myObj);
                }
              })
              .catch(err => emit.reject('repo.get', client, '500', err));
          }
        })
        .catch(err => emit.reject('repo.get', client, '500', err));
    })
    .catch(err => emit.reject('repo.get', client, '401', err));
}

function repoData(client, msg) {
  if (!msg.name) {
    return emit.reject('repo.data', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then(() => {
      db.repo
        .findOne({ where: { name: msg.name } })
        .then((repo) => {
          if (!repo) {
            return emit.reject('repo.data', client, '400', 'can\'t find repo');
          }
          const members = [];
          const myObj = {};
          db.repoMember
            .findAll({ where: { repo_id: repo.id } })
            .then((memberList) => {
              const len = Object.keys(memberList).length;
              let i = 0;
              for (let c = 0; memberList[c]; c += 1) {
                db.user
                  .findOne({ where: { id: memberList[c].user_id } })
                  .then((member) => {
                    const tmp = {
                      login: member.login,
                      role: memberList[c].role,
                    };
                    if (tmp.role === 'host') {
                      myObj.host = tmp.login;
                    }
                    members.push(tmp);
                    i += 1;
                    if (i === len) {
                      myObj.id = repo.id;
                      myObj.name = repo.name;
                      myObj.members = members;
                      const post = 'data returned';
                      return emit.resolveWithData('repo.data', client, '200', post, myObj);
                    }
                  })
                  .catch(err => emit.reject('repo.data', client, '500', err));
              }
            })
            .catch(err => emit.reject('repo.data', client, '500', err));
        })
        .catch(err => emit.reject('repo.data', client, '500', err));
    })
    .catch(err => emit.reject('repo.data', client, '401', err));
}

function addMember(client, msg) {
  if (!msg.name || !msg.login) {
    return emit.reject('repo.addMember', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.repo
        .findOne({ where: { name: msg.name, host: data.id } })
        .then((repo) => {
          if (!repo) {
            return emit.reject('repo.addMember', client, '400', 'can\'t find repo');
          }
          db.user
            .findOne({ where: { login: msg.login } })
            .then((member) => {
              if (!member) {
                return emit.reject('repo.addMember', client, '400', 'can\'t find member');
              }
              db.repoMember
                .findOrCreate({ where: { user_id: member.id, repo_id: repo.id, role: 'member' } })
                .then(() => {
                  repo
                    .updateAttributes({ is_shared: true })
                    .then(() => emit.resolve('repo.addMember', client, '200', 'member added'))
                    .catch(err => emit.reject('repo.addMember', client, '500', err));
                })
                .catch(err => emit.reject('repo.addMember', client, '500', err));
            })
            .catch(err => emit.reject('repo.addMember', client, '500', err));
        })
        .catch(err => emit.reject('repo.addMember', client, '500', err));
    })
    .catch(err => emit.reject('repo.addMember', client, '401', err));
}

function deleteMember(client, msg) {
  if (!msg.name || !msg.login) {
    return emit.reject('repo.deleteMember', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then((data) => {
      db.repo
        .findOne({ where: { name: msg.name, host: data.id } })
        .then((repo) => {
          if (!repo) {
            return emit.reject('repo.deleteMember', client, '400', 'can\'t find repo');
          }
          db.user
            .findOne({ where: { login: msg.login } })
            .then((member) => {
              if (!member) {
                return emit.reject('repo.deleteMember', client, '400', 'can\'t find member');
              }
              if (data.id === member.id) {
                return emit.reject('repo.deleteMember', client, '400', 'can\'t delete host (it\'s you !)');
              }
              db.repoMember
                .destroy({ where: { user_id: member.id, repo_id: repo.id } })
                .then(() => {
                  db.repoMember
                    .findAll({ where: { repo_id: repo.id } })
                    .then((members) => {
                      const len = Object.keys(members).length;
                      if (len === 1) {
                        repo
                          .updateAttributes({ is_shared: false })
                          .then(() => emit.resolve('repo.deleteMember', client, '200', 'member deleted'))
                          .catch(err => emit.reject('repo.deleteMember', client, '500', err));
                      } else {
                        return emit.resolve('repo.deleteMember', client, '200', 'member deleted');
                      }
                    })
                    .catch(err => emit.reject('repo.deleteMember', client, '500', err));
                })
                .catch(err => emit.reject('repo.deleteMember', client, '500', err));
            })
            .catch(err => emit.reject('repo.deleteMember', client, '500', err));
        })
        .catch(err => emit.reject('repo.deleteMember', client, '500', err));
    })
    .catch(err => emit.reject('repo.deleteMember', client, '401', err));
}

export default function run(client) {
  client.on('repo.create', (msg) => { create(client, dialogue.convert(msg)); });
  client.on('repo.delete', (msg) => { remove(client, dialogue.convert(msg)); });

  client.on('repo.rename', (msg) => { rename(client, dialogue.convert(msg)); });

  client.on('repo.get', () => { get(client); });
  client.on('repo.data', (msg) => { repoData(client, dialogue.convert(msg)); });

  client.on('repo.addMember', (msg) => { addMember(client, dialogue.convert(msg)); });
  client.on('repo.deleteMember', (msg) => { deleteMember(client, dialogue.convert(msg)); });
}
