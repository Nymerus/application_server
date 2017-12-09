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
socket.on('admin.upgrade', (data) => { dialogue.test('admin.upgrade', data); });
socket.on('admin.connected', (data) => { dialogue.test('admin.connected', data); });

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
  socket.emit('admin.upgrade', {
    login: 'diff user',
    type: 'admin',
  });
}, 5000);

setTimeout(() => {
  socket.emit('admin.connected', {});
}, 6000);

setTimeout(() => {
  socket.emit('contact.profile', {
    login: 'diff user',
  });
}, 7000);

setTimeout(() => {
  socket.emit('user.delete', {
    login: 'diff user',
  });
}, 8000);

setTimeout(() => {
  socket.emit('user.getData', {});
}, 9000);

setTimeout(() => {
  socket.emit('user.disconnect', {});
}, 10000);
