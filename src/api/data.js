// @flow

import { execFile } from 'child_process';
import { readFile, unlink } from 'fs';
// src files
import * as dialogue from '../dialogue';
import * as db from '../database';
import * as security from '../security';
import * as emit from '../emit';

const prExecFile = (url: string, args: any, opt?: any) =>
  new Promise(res =>
    execFile(url, args, opt, (error, stdout, stderr) => res({ error, stdout, stderr })));

const prReadFile = url =>
  new Promise(res =>
    readFile(url, (error, data) => res({ error, data })));

const prExecFileStdin = (url: string, args: any, opt?: any, stdin: any) =>
  new Promise((res) => {
    const c = execFile(url, args, opt, (error, stdout, stderr) => res({ error, stdout, stderr }));
    c.stdin.end(stdin, 'binary');
  });

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
    const repo = await db.repo.findOne({ where: { id: msg.id } });
    const cwd = `/home/git/repositories/${repo.host}/${msg.id}.git`;
    const { error, stdout, stderr } = await prExecFile(
      'git',
      ['archive', '-o', 'latest.zip', 'HEAD'],
      { cwd },
    );
    if (error || stderr) {
      return emit.reject(
        'data.get',
        client, '500',
        `Catched error: ${
          error ? error.toString() : '' ||
          stderr ? stderr.toString() : ''
        }`,
      );
    }
    if (error || stderr) return emit.reject('data.get', client, '500', `Catched error: ${error || stderr}`);
    const { error: err, data } = await prReadFile(`${cwd}/latest.zip`);
    unlink(`${cwd}/latest.zip`, () => undefined);
    if (err) return emit.reject('data.get', client, '500', `Catched error: ${err.toString()}`);
    emit.resolveWithData('data.get', client, '200', 'Sending data from readfile.', { data });
  } catch (e) {
    emit.reject('data.get', client, '500', `Catched error: ${e}`);
  }
}

async function dataAdd(client, rawMsg) {
  if (!rawMsg.id || !rawMsg.path) {
    return emit.reject('data.add', client, '400', 'Invalid parameters.');
  }
  const msg = { ...rawMsg };
  if (msg.path[msg.path.length - 1] === '/') msg.path += '.init'; // path is folder ? add .init
  if (!msg.data) msg.data = 'no-empty-data'; // data undefined ? data = ''

  try {
    const user: User = await security.checkUserType(client.id, 'basic');
    const repo = await db.repo.findOne({ where: { id: msg.id } });
    // check access to repo ???
    const cwd = `/home/git/repositories/${repo.host}/${msg.id}.git`;
    console.log('uri', cwd);
    let showRef = await prExecFile('git', ['show-ref', '-s', 'master'], { cwd });
    let readTree = {};
    if (showRef.stdout) {
      readTree = await prExecFile('git', [
        'read-tree',
        showRef.stdout.toString().replace('\n', ''),
      ], { cwd });
    } else {
      readTree = await prExecFile('git', ['read-tree', '--empty'], { cwd });
    }
    console.log('readtree', JSON.stringify(readTree), msg.path);
    if (readTree.error) {
      return emit.reject(
        'data.add',
        client,
        '500',
        `${
          readTree.error ? readTree.error.toString() : ''
        }, ${
          readTree.stderr ? readTree.stderr.toString() : ''
        }, ${
          readTree.stdout ? readTree.stdout.toString() : ''
        }`,
      );
    }

    const hashObject = await prExecFileStdin('git', [
      'hash-object',
      '-w',
      '--stdin',
    ], { cwd }, msg.data);
    console.log('hash', JSON.stringify(hashObject), msg.path);
    if (hashObject.error || hashObject.stderr || !hashObject.stdout) {
      return emit.reject(
        'data.add',
        client,
        '500',
        `${
          hashObject.error ? hashObject.error.toString() : ''
        }, ${
          hashObject.stderr ? hashObject.stderr.toString() : ''
        }, ${
          hashObject.stdout ? hashObject.stdout.toString() : ''
        }`,
      );
    }
    const updateIndex = await prExecFile('git', [
      'update-index',
      '--add',
      '--cacheinfo',
      '644',
      hashObject.stdout.replace('\n', ''),
      msg.path,
    ], { cwd });
    console.log('u index', JSON.stringify(updateIndex), msg.path);
    if (updateIndex.error || updateIndex.stderr) {
      return emit.reject(
        'data.add',
        client,
        '500',
        `${
          updateIndex.error ? updateIndex.error.toString() : ''
        }, ${
          updateIndex.stderr ? updateIndex.stderr.toString() : ''
        }, ${
          updateIndex.stdout ? updateIndex.stdout.toString() : ''
        }`,
      );
    }

    const writeTree = await prExecFile('git', ['write-tree'], { cwd });
    console.log('writeTree', JSON.stringify(writeTree), msg.path);
    if (writeTree.error || writeTree.stderr || !writeTree.stdout) {
      return emit.reject(
        'data.add',
        client,
        '500',
        `${
          writeTree.error ? writeTree.error.toString() : ''
        }, ${
          writeTree.stderr ? writeTree.stderr.toString() : ''
        }, ${
          writeTree.stdout ? writeTree.stdout.toString() : ''
        }`,
      );
    }
    showRef = await prExecFile('git', ['show-ref', '-s', 'master'], { cwd });

    let commitTree = {};
    const commitMessage = `User ${user.login} add ${msg.path}.`;
    if (showRef.stdout) {
      commitTree = await prExecFile('git', [
        'commit-tree',
        writeTree.stdout.toString().replace('\n', ''),
        '-p',
        showRef.stdout.toString().replace('\n', ''),
        '-m',
        commitMessage,
      ], { cwd });
    } else {
      commitTree = await prExecFile('git', [
        'commit-tree',
        writeTree.stdout.toString().replace('\n', ''),
        '-m',
        commitMessage,
      ], { cwd });
    }
    console.log('commit', JSON.stringify(commitTree), msg.path);
    if (commitTree.error || commitTree.stderr || !commitTree.stdout) {
      return emit.reject(
        'data.add',
        client,
        '500',
        `${
          commitTree.error ? commitTree.error.toString() : ''
        }, ${
          commitTree.stderr ? commitTree.stderr.toString() : ''
        }, ${
          commitTree.stdout ? commitTree.stdout.toString() : ''
        }`,
      );
    }
    showRef = await prExecFile('git', ['show-ref', '-s', 'master'], { cwd });

    const updateRef = await prExecFile('git', [
      'update-ref',
      'refs/heads/master',
      commitTree.stdout.toString().replace('\n', ''),
      showRef.stdout.toString().replace('\n', ''),
    ], { cwd });
    console.log('u ref', JSON.stringify(updateRef), msg.path);
    if (updateRef.error || updateRef.stderr) {
      return emit.reject(
        'data.add',
        client,
        '500',
        `${
          updateRef.error ? updateRef.error.toString() : ''
        }, ${
          updateRef.stderr ? updateRef.stderr.toString() : ''
        }, ${
          updateRef.stdout ? updateRef.stdout.toString() : ''
        }`,
      );
    }
    emit.resolveWithData('data.add', client, '200', `File ${msg.path} added.`, { id: msg.id });
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
    const repo = await db.repo.findOne({ where: { id: msg.id } });
    const { error, stdout, stderr } = await prExecFile(
      '/home/git/data/src/scripts/delFile.sh',
      [msg.path, `User ${user.login} deleted ${msg.path}.`],
      { cwd: `/home/git/repositories/${repo.host}/${msg.id}.git` },
    );
    if (error || (stderr && !(stderr.includes('use --empty')))) {
      return emit.reject(
        'data.del',
        client,
        '500',
        `${
          error ? error.toString() : ''
        }, ${
          stderr ? stderr.toString() : ''
        }, ${
          stdout ? stdout.toString() : ''
        }`,
      );
    }
    emit.resolveWithData(
      'data.del',
      client, '200',
      `File ${msg.path} removed, ${stdout ? stdout.toString() : ''}.`,
      { id: msg.id },
    );
  } catch (e) {
    emit.reject('data.del', client, '500', `Catched error: ${e}`);
  }
}

export default function run(client: Client) {
  client.on('data.get', (msg: any) => dataGet(client, dialogue.convert(msg)));
  client.on('data.add', (msg: msgDataAdd) => {
    console.log('data.add !!!!!!!!!!!!!!!!', msg);
    dataAdd(client, dialogue.convert(msg));
  });

  client.on('data.del', (msg: msgDataDel) => {
    dataDel(client, dialogue.convert(msg));
  });
}
