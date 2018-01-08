// @flow
import { appendFile, unlink, access, constants } from 'fs';
import { execFile } from 'child_process';

// src files
import * as dialogue from '../dialogue';
import * as db from '../database';
import * as security from '../security';
import * as emit from '../emit';

const prExecFile = (url, args, opt?) =>
  new Promise(res =>
    execFile(url, args, opt, (error, stdout, stderr) => res({ error, stdout, stderr })));
const prAppendFile = (url, text) =>
  new Promise(res => appendFile(url, text, error => res({ error })));
const prUnlink = url => new Promise(res => unlink(url, error => res({ error })));
const prAccess = (url, mode) => new Promise(res => access(url, mode, error => res({ error })));

type Client = {
  emit: (string, any) => any,
  on: (string, (any) => any) => any,
  id: string,
};

async function gitoliteUpdate(cl, chan, code, callback) {
  try {
    const { error, stdout, stderr } = await prExecFile('/home/git/bin/gitolite', ['compile']);
    if (stdout) console.log('prExecFile gitolite compile stdout', stdout);
    if (stderr) console.log('prExecFile gitolite compile stderr', stderr);
    if (error && stderr && stderr.indexOf('Bad file') === -1) {
      return emit.reject(
        chan,
        cl,
        code,
        `[ERROR] \t erreur lors de la compile gitolite: ${error.toString()}\n`,
      );
    }

    const { error: postErr, stdout: postStdout, stderr: postStderr } = await prExecFile(
      '/home/git/bin/gitolite',
      ['trigger', 'POST_COMPILE'],
    );

    if (postErr) {
      return emit.reject(
        chan,
        cl,
        code,
        `[ERROR] \t erreur lors du déclanchement POST_COMPILE de gitolite: ${postErr.toString()}\n`,
      );
    }
    if (postStdout) console.log(postStdout);
    if (postStderr) console.log(postStderr);

    callback();
  } catch (e) {
    emit.reject(chan, cl, code, `[ERROR] Catched lors de la compile gitolite: ${e}\n`);
  }
}

async function create(client, msg) {
  if (!msg.name || !msg.path) {
    return emit.reject('repo.create', client, '400', 'invalid parameters');
  }

  try {
    const data = await security.checkUserType(client.id, 'basic');
    const repo = await db.repo.findOne({ where: { name: msg.name, host: data.id } });

    if (repo) return emit.reject('repo.create', client, '400', 'repo name already used');

    const newRepo = await db.repo.create({ name: msg.name, host: data.id, default_path: msg.path });
    await db.repoMember.create({ user_id: data.id, repo_id: newRepo.id, role: 'host' });

    // creating repo
    const text = `repo ${data.id}/${newRepo.id}\n    C\t=\t${data.id}\n    RW+\t=\t${
      data.id
    }\n    RW\t=\t${data.id}\n    R\t=\t${data.id}\n\n`;

    await prAppendFile(`/home/git/.gitolite/conf/${newRepo.id}.conf`, text);
    gitoliteUpdate(client, 'repo.create', '500', () =>
      emit.resolveWithData('repo.create', client, '200', 'repo created', { id: newRepo.id }));
  } catch (e) {
    emit.reject('repo.create', client, '500', e);
  }
}

async function remove(client, msg) {
  if (!msg.name) return emit.reject('repo.delete', client, '400', 'invalid parameters');

  try {
    const data = await security.checkUserType(client.id, 'basic');
    const repo = await db.repo.findOne({ where: { name: msg.name, host: data.id } });

    if (!repo) return emit.reject('repo.delete', client, '400', "can't find repo");

    await repo.destroy();
    await db.repoMember.destroy({ where: { repo_id: repo.id } });

    //  delete git repo here
    await prUnlink(`/home/git/.gitolite/conf/${repo.id}.conf`);
    gitoliteUpdate(client, 'repo.delete', '500', () =>
      emit.resolve('repo.delete', client, '200', 'repo deleted'));
  } catch (e) {
    emit.reject('repo.delete', client, '500', e);
  }
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
            return emit.reject('repo.rename', client, '400', "can't find repo");
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
                  id: repo.id,
                  isShared: repo.is_shared,
                };
                if (repo.host === data.id) { tmp.isHost = true; } else { tmp.isHost = false; }
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
  if (!msg.id) {
    return emit.reject('repo.data', client, '400', 'invalid parameters');
  }

  security
    .checkUserType(client.id, 'basic')
    .then(() => {
      db.repo
        .findOne({ where: { id: msg.id } })
        .then((repo) => {
          if (!repo) {
            return emit.reject('repo.data', client, '400', "can't find repo");
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
                      myObj.isShared = repo.is_shared;
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

async function repoOneContent(client, msg: { id: string }) {
  try {
    await security.checkUserType(client.id, 'basic');
    const repo = await db.repo.findOne({ where: { id: msg.id } });

    if (!repo) return emit.reject('repo.content', client, '500', 'repo not found');

    const { error } = await prAccess(`/home/git/repositories/${repo.host}`, constants.R_OK);
    if (error) {
      return emit.resolve(
        'repo.content',
        client,
        '200',
        `repo returned but void or other.. : ${error.toString()}`,
      );
    }

    const { error: treeErr, stdout: treeOut, stderr: treeSErr } = await prExecFile(
      '/usr/bin/git',
      ['ls-tree', '-r', 'HEAD'],
      { cwd: `/home/git/repositories/${repo.host}/${msg.id}.git` },
    );
    if (treeErr && treeSErr.toString() !== 'fatal: Not a valid object name HEAD\n') {
      return emit.resolve(
        'repo.content',
        client,
        '200',
        `repo returned but no head or other..: ${treeErr.toString()}, ${treeSErr.toString()}`,
      );
    }

    emit.resolveWithData('repo.content', client, '200', 'repository content.', {
      content: treeOut,
      id: msg.id,
    });
  } catch (e) {
    emit.reject('repo.content', client, '500', `repo.content err ${e}`);
  }
}

const eachContent = async (repoList) => {
  const allContent = await Promise.all(repoList.map(async (v) => {
    const repo = await db.repo.findOne({ where: { id: v.repo_id } });
    if (!repo) return null;
    const { error } = await prAccess(`/home/git/repositories/${repo.host}`, constants.R_OK);
    if (error) return null;
    const { error: execError, stderr, stdout } = await prExecFile(
      '/usr/bin/git',
      ['ls-tree', '-r', 'HEAD'],
      { cwd: `/home/git/repositories/${repo.host}/${repo.id}.git` },
    );
    if (execError || stderr || !stdout) return null;
    return stdout;
  }));
  return allContent || null;
};

async function repoAllContent(client) {
  try {
    const data = await security.checkUserType(client.id, 'basic');
    const repoList = await db.repoMember.findAll({ where: { user_id: data.id } });
    const allContent = await eachContent(repoList);
    if (allContent) {
      return emit.resolveWithData('repo.content', client, '200', 'INPROGRESS', {
        content: allContent,
      });
    }
    return emit.reject('repo.content', client, '500', 'repo.content null');
  } catch (e) {
    emit.reject('repo.content', client, '500', `repo.content err ${e}`);
  }
}

function repoContent(client, msg) {
  if (!msg.id) return repoAllContent(client);
  return repoOneContent(client, msg);
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
            return emit.reject('repo.addMember', client, '400', "can't find repo");
          }
          db.user
            .findOne({ where: { login: msg.login } })
            .then((member) => {
              if (!member) {
                return emit.reject('repo.addMember', client, '400', "can't find member");
              }
              db.repoMember
                .findOrCreate({
                  where: {
                    user_id: member.id,
                    repo_id: repo.id,
                    role: 'member',
                  },
                })
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
            return emit.reject('repo.deleteMember', client, '400', "can't find repo");
          }
          db.user
            .findOne({ where: { login: msg.login } })
            .then((member) => {
              if (!member) {
                return emit.reject('repo.deleteMember', client, '400', "can't find member");
              }
              if (data.id === member.id) {
                return emit.reject(
                  'repo.deleteMember',
                  client,
                  '400',
                  "can't delete host (it's you !)",
                );
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
                          .then(() =>
                            emit.resolve('repo.deleteMember', client, '200', 'member deleted'))
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

export default function run(client: Client) {
  client.on('repo.create', (msg) => {
    create(client, dialogue.convert(msg));
  });
  client.on('repo.delete', (msg) => {
    remove(client, dialogue.convert(msg));
  });

  client.on('repo.rename', (msg) => {
    rename(client, dialogue.convert(msg));
  });

  client.on('repo.get', () => {
    get(client);
  });
  client.on('repo.content', (msg) => {
    repoContent(client, dialogue.convert(msg));
  });
  client.on('repo.data', (msg) => {
    repoData(client, dialogue.convert(msg));
  });

  client.on('repo.addMember', (msg) => {
    addMember(client, dialogue.convert(msg));
  });
  client.on('repo.deleteMember', (msg) => {
    deleteMember(client, dialogue.convert(msg));
  });
}
