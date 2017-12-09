#!/usr/bin/env node

// node modules
import SocketIO from 'socket.io-client';

// src files
import config from '../package.json';
import * as dialogue from '../src/dialogue';

const socket = SocketIO(`${config.nymerus.address}:${config.nymerus.port}`);

socket.on('user.connect', (data) => { dialogue.test('user.connect', data); });
socket.on('user.disconnect', (data) => { dialogue.test('user.disconnect', data); });
socket.on('user.create', (data) => { dialogue.test('user.create', data); });
socket.on('user.delete', (data) => { dialogue.test('user.delete', data); });
socket.on('user.getData', (data) => { dialogue.test('user.getData', data); });
socket.on('user.updatePassword', (data) => { dialogue.test('user.updatePassword', data); });
socket.on('user.updateIcon', (data) => { dialogue.test('user.updateIcon', data); });
socket.on('user.updateLogin', (data) => { dialogue.test('user.updateLogin', data); });
socket.on('user.updateEmail', (data) => { dialogue.test('user.updateEmail', data); });
socket.on('contact.profile', (data) => { dialogue.test('contact.profile', data); });

socket.on('repo.create', (data) => { dialogue.test('repo.create', data); });
socket.on('repo.delete', (data) => { dialogue.test('repo.delete', data); });
socket.on('repo.rename', (data) => { dialogue.test('repo.rename', data); });
socket.on('repo.addMember', (data) => { dialogue.test('repo.addMember', data); });
socket.on('repo.get', (data) => { dialogue.test('repo.get', data); });
socket.on('repo.data', (data) => { dialogue.test('repo.data', data); });
socket.on('repo.deleteMember', (data) => { dialogue.test('repo.deleteMember', data); });

setTimeout(() => {
  socket.emit('user.connect', {
    email: 'superadmin@nymerus.com',
    password: 'test',
    token: false,
    sessionId: 'adresse-Mac',
    sessionName: 'session de test',
    sessionType: 'test',
  });
}, 1000);

setTimeout(() => {
  socket.emit('user.create', {
    login: 'userTest',
    email: 'test@nymerus.com',
    icon: 'test-icon',
  });
}, 2000);

setTimeout(() => {
  socket.emit('user.updateLogin', {
    login: 'userTest',
    data: 'diff user',
  });
}, 3000);

setTimeout(() => {
  socket.emit('user.updateEmail', {
    login: 'diff user',
    data: 'new@nymerus.com',
  });
}, 4000);

setTimeout(() => {
  socket.emit('contact.profile', {
    login: 'diff user',
  });
}, 5000);

setTimeout(() => {
  socket.emit('repo.create', {
    name: 'repo test',
    path: 'example of path',
  });
}, 6000);

setTimeout(() => {
  socket.emit('repo.rename', {
    name: 'repo test',
    newName: 'repo',
  });
}, 7000);

setTimeout(() => {
  socket.emit('repo.addMember', {
    name: 'repo',
    login: 'diff user',
  });
}, 8000);

setTimeout(() => {
  socket.emit('repo.get', {});
}, 9000);

setTimeout(() => {
  socket.emit('repo.data', {
    name: 'repo',
  });
}, 10000);

setTimeout(() => {
  socket.emit('repo.deleteMember', {
    name: 'repo',
    login: 'diff user',
  });
}, 11000);

setTimeout(() => {
  socket.emit('repo.delete', {
    name: 'repo',
  });
}, 12000);

setTimeout(() => {
  socket.emit('user.delete', {
    login: 'diff user',
  });
}, 13000);

setTimeout(() => {
  socket.emit('user.getData', {});
}, 14000);

setTimeout(() => {
  socket.emit('user.disconnect', {});
}, 15000);
