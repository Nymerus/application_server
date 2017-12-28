// @flow
// import { appendFile, unlink, access, constants } from 'fs';
import { execFile } from 'child_process';

// src files
import * as dialogue from '../dialogue';
// import * as db from '../database';
import * as security from '../security';
import * as emit from '../emit';

const prExecFile = (url, args, opt?) =>
  new Promise(res =>
    execFile(url, args, opt, (error, stdout, stderr) => res({ error, stdout, stderr })));

type Client = {
  emit: (string, any) => any,
  on: (string, (any) => any) => any,
  id: string,
};

type msgDataAdd = {
  id: string,
  path: string,
  data?: any,
};

type msgDataDel = {
  id: string,
  path: string,
  data?: any,
};

type User = {
  id: string,
  login: string,
};

async function dataAdd(client, rawMsg) {
  if (!rawMsg.id || !rawMsg.path) {
    return emit.reject('data.add', client, '400', 'Invalid parameters.');
  }
  const msg = { ...rawMsg };
  if (msg.path[msg.path.length - 1] === '/') msg.path += '.init'; // path is folder ? add .init
  if (!msg.data) msg.data = ''; // data undefined ? data = ''

  try {
    const user: User = await security.checkUserType(client.id, 'basic');
    // check access to repo ???
    const { error, stdout, stderr } = await prExecFile(
      '/home/git/data/src/scripts/addFile.sh',
      [msg.data, '644', msg.path, `User ${user.login} add ${msg.path}.`],
      { cwd: `/home/git/repositories/${user.id}/${msg.id}.git` },
    );
    if (error && error.toString() !== null && error.toString() !== 'null') {
      return emit.reject(
        'data.add',
        client,
        '500',
        `${error.toString()}, ${stderr.toString()}, ${stdout.toString()}`,
      );
    }
    emit.resolve('data.add', client, '200', `File ${msg.path} added, ${stdout.toString()}.`);
  } catch (e) {
    emit.reject('data.add', client, '500', `Catched error: ${e}`);
  }
}

async function dataDel(client, rawMsg) {
  if (!rawMsg.id || !rawMsg.path) {
    return emit.reject('data.del', client, '400', 'Invalid parameters.');
  }
  const msg = { ...rawMsg };
  try {
    const user: User = await security.checkUserType(client.id, 'basic');
    // check access to repo ???
    const { error, stdout, stderr } = await prExecFile(
      '/home/git/data/src/scripts/delFile.sh',
      [msg.path, `User ${user.login} deleted ${msg.path}.`],
      { cwd: `/home/git/repositories/${user.id}/${msg.id}.git` },
    );
    if (error || stderr) {
      return emit.reject(
        'data.del',
        client,
        '500',
        `${error ? error.toString() : ''}, ${stderr.toString()}, ${stdout.toString()}`,
      );
    }
    emit.resolve('data.del', client, '200', `File ${msg.path} removed, ${stdout.toString()}.`);
  } catch (e) {
    emit.reject('data.del', client, '500', `Catched error: ${e}`);
  }
}

export default function run(client: Client) {
  client.on('data.add', (msg: msgDataAdd) => {
    dataAdd(client, dialogue.convert(msg));
  });

  client.on('data.del', (msg: msgDataDel) => {
    dataDel(client, dialogue.convert(msg));
  });
}
