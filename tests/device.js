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
socket.on('device.get', (data) => { dialogue.test('device.get', data); });
socket.on('device.delete', (data) => { dialogue.test('device.delete', data); });
socket.on('device.rename', (data) => { dialogue.test('device.rename', data); });

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
  socket.emit('user.delete', {
    login: 'userTest',
  });
}, 3000);

setTimeout(() => {
  socket.emit('user.getData', {});
}, 4000);

setTimeout(() => {
  socket.emit('device.rename', {
    sessionId: 'adresse-Mac',
    name: 'rename de test',
  });
}, 5000);

setTimeout(() => {
  socket.emit('device.get', {});
}, 6000);

setTimeout(() => {
  socket.emit('device.delete', {
    sessionId: 'adresse-Mac',
  });
}, 7000);

setTimeout(() => {
  socket.emit('device.get', {});
}, 8000);

setTimeout(() => {
  socket.emit('user.disconnect', {});
}, 9000);
