// @flow
// import { appendFile, unlink, access, constants } from 'fs';
import { execFile } from 'child_process';
import { readFile } from 'fs';
// src files
import * as dialogue from '../dialogue';
// import * as db from '../database';
import * as security from '../security';
import * as emit from '../emit';

const prExecFile = (url, args, opt?) =>
  new Promise(res =>
    execFile(url, args, opt, (error, stdout, stderr) => res({ error, stdout, stderr })));

const prReadFile = (url, args, opt?) =>
  new Promise(res =>
    readFile(url, args, opt, (error, data) => res({ error, data })));


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

async function dataGet(client: any, rawMsg: any) {
  const msg = { ...rawMsg };
  if (!msg.id) return emit.reject('data.get', client, '400', 'Invalid parameters.');
  try {
    const user: User = await security.checkUserType(client.id, 'basic');
    if (!user) return emit.reject('data.get', client, '400', 'Invalid parameters.');
    const path = `/home/git/repositories/${user.id}/${msg.id}.git`
    const { error, stdout, stderr } = await prExecFile(
      'git',
      ['archive', '-o', 'latest.zip', 'HEAD'],
      { cwd: `/home/git/repositories/${user.id}/${msg.id}.git` },
    );
    if (error || stderr) return emit.reject('data.add', client, '500', `Catched error: ${error || stderr}`);
    console.log('stdout', stdout);
    const { error: err, data } = prReadFile(`${path}/latest.zip`);
    if (err) return emit.reject('data.add', client, '500', `Catched error: ${error}`);
    emit.resolveWithData('data.add', client, '200', 'Sending data from readfile.', { data });
  } catch (e) {
    emit.reject('data.add', client, '500', `Catched error: ${e}`);
  }
}

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
    console.log('error', error ? error.toString() : null, 'stdout', stdout ? stdout.toString() : null, 'stderr', stderr ? stderr.toString() : null);
    if (error || stderr) {
      return emit.reject(
        'data.add',
        client,
        '500',
        `${error.toString()}, ${stderr.toString()}, ${stdout.toString()}`,
      );
    }
    emit.resolveWithData('data.add', client, '200', `File ${msg.path} added, ${stdout.toString()}.`, { id: msg.id });
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
    emit.resolveWithData('data.del', client, '200', `File ${msg.path} removed, ${stdout.toString()}.`, { id: msg.id });
  } catch (e) {
    emit.reject('data.del', client, '500', `Catched error: ${e}`);
  }
}

export default function run(client: Client) {
  client.on('data.get', (msg: any) => dataGet(client, dialogue.convert(msg)));
  client.on('data.add', (msg: msgDataAdd) => {
    dataAdd(client, dialogue.convert(msg));
  });

  client.on('data.del', (msg: msgDataDel) => {
    dataDel(client, dialogue.convert(msg));
  });
}
