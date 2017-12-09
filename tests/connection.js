#!/usr/bin/env node

// node modules
import SocketIO from 'socket.io-client';

// src files
import config from '../package.json';

const socket = SocketIO(`${config.nymerus.address}:${config.nymerus.port}`);

socket.on('connection', () => {});
