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

socket.on('contact.add', (data) => { dialogue.test('contact.add', data); });
socket.on('contact.get', (data) => { dialogue.test('contact.get', data); });
socket.on('contact.delete', (data) => { dialogue.test('contact.delete', data); });
socket.on('contact.search', (data) => { dialogue.test('contact.search', data); });
socket.on('contact.profile', (data) => { dialogue.test('contact.profile', data); });

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
  socket.emit('contact.add', {
    login: 'userTest',
  });
}, 3000);

setTimeout(() => {
  socket.emit('contact.get', {});
}, 4000);

setTimeout(() => {
  socket.emit('contact.search', {
    value: '*',
  });
}, 5000);

setTimeout(() => {
  socket.emit('contact.profile', {
    login: 'userTest',
  });
}, 6000);

setTimeout(() => {
  socket.emit('contact.delete', {
    login: 'userTest',
  });
}, 7000);

setTimeout(() => {
  socket.emit('user.delete', {
    login: 'userTest',
  });
}, 8000);

setTimeout(() => {
  socket.emit('user.getData', {});
}, 9000);

setTimeout(() => {
  socket.emit('user.disconnect', {});
}, 10000);
