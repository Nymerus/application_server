// @flow
// node modules
import SocketIO from 'socket.io-client';
import { readFileSync, writeFile } from 'fs';
// src files
import config from '../package.json';

let socket = SocketIO(`${config.nymerus.address}:${config.nymerus.port}`);

const delUser = () =>
  new Promise((res) => {
    socket.emit('user.delete', { login: 'userTest' });
    socket.once('user.delete', res);
  });

const delRepo = id =>
  new Promise((res) => {
    socket.emit('repo.delete', { id, name: 'repo test' });
    socket.once('repo.delete', res);
  });

const content = id =>
  new Promise((res) => {
    socket.emit('repo.content', { id });
    socket.once('repo.content', res);
  });

const getRepo = id =>
  new Promise((res) => {
    socket.emit('data.get', { id });
    socket.once('data.get', res);
  });

const delFolder = id =>
  new Promise((res) => {
    socket.emit('data.del', { id, path: 'folder0/' });
    socket.once('data.del', res);
  });

const delFile = id =>
  new Promise((res) => {
    socket.emit('data.del', { id, path: 'folder1/toto' });
    socket.once('data.del', res);
  });

const createFile = id =>
  new Promise((res) => {
    socket.emit('data.add', { id, path: 'folder1/toto.docx', data: readFileSync('tests/d.docx') });
    socket.once('data.add', res);
  });

const createFolder = id =>
  new Promise((res) => {
    socket.emit('data.add', { id, path: 'folder0/' });
    socket.once('data.add', res);
  });

const createRepo = () =>
  new Promise((res) => {
    socket.emit('repo.create', {
      name: 'repo test',
      path: 'example of path',
    });
    socket.once('repo.create', res);
  });

const userDisconnect = () =>
  new Promise((res) => {
    socket.emit('user.disconnect');
    socket.once('user.disconnect', res);
  });

const userConnect = pass =>
  new Promise((res) => {
    const d = {
      email: 'test@nymerus.com',
      password: pass,
      token: false,
      sessionId: 'adresse-Mac',
      sessionName: 'session de test',
      sessionType: 'test',
    };
    console.log('pass?', pass, d);
    socket.emit('user.connect', d);
    socket.once('user.connect', res);
  });

const adminConnect = () =>
  new Promise((res) => {
    socket.emit('user.connect', {
      email: 'superadmin@nymerus.com',
      password: 'test',
      token: false,
      sessionId: 'adresse-Mac',
      sessionName: 'session de test',
      sessionType: 'test',
    });
    socket.once('user.connect', res);
  });

const createUser = () =>
  new Promise((res) => {
    socket.emit('user.create', {
      login: 'userTest',
      email: 'test@nymerus.com',
      icon: 'test-icon',
    });
    socket.once('user.create', res);
  });

const link = () =>
  new Promise((res) => {
    socket = SocketIO(`${config.nymerus.address}:${config.nymerus.port}`);
    socket.on('connect', res);
  });

const delay = time =>
  new Promise((res) => {
    setTimeout(res, time);
  });

async function run() {
  try {
    await adminConnect();
    await delUser();
    const cUser = await createUser();
    console.log('cUser', cUser, cUser.password);
    await userDisconnect();
    await delay(1000);
    await link();
    console.log('admin disconnected');
    await userConnect(cUser.password);
    console.log('user connected');
    const repo = await createRepo();
    console.log('repo', repo);
    await createFolder(repo.id);
    await createFile(repo.id);
    const content0 = await content(repo.id);
    const allContent = await content();
    const zip = await getRepo(repo.id);
    console.log(typeof zip.data);
    writeFile('repo.zip', zip.data);
    console.log('0', content0, allContent);
    await delFile(repo.id);
    const content1 = await content(repo.id);
    const allContent1 = await content();
    console.log('1', content1, allContent1);
    await delFolder(repo.id);
    const content2 = await content(repo.id);
    const allContent2 = await content();
    console.log('2', content2, allContent2);

    await delRepo(repo.id);
    await userDisconnect();
    await link();
    await adminConnect();
    await delUser();
    await userDisconnect();
    process.exit();
  } catch (e) {
    console.log('catched promise', e);
    process.exit(1);
  }
  console.log('finished');
}

run();
