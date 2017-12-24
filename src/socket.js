// node modules
import SocketIO from 'socket.io';

// src file
import config from '../package.json';
import * as dialogue from './dialogue';
import * as routes from './routes';
import * as userManagement from './user_management';

const clientsList = {};

// force close one client connection
export function closeOneSocket(client) {
  if (Object.prototype.hasOwnProperty.call(clientsList, client.id) === false) {
    return false;
  }
  clientsList[client.id].disconnect();
  return true;
}

// force close all clients connections
export function closeAllSockets() {
  const clientsNumber = Object.keys(clientsList).length;

  Object.keys(clientsList).forEach((client, index) => {
    clientsList[client].close();
    if (index === clientsNumber - 1) {
      dialogue.server('info', 'socket', 'all sockets disconnected');
    }
  });
}

// init and open all sockets
export function run() {
  if (!config.nymerus.port) {
    dialogue.server('error', 'socket', "can't read server port");
  } else {
    const sockets = SocketIO(config.nymerus.port);

    sockets.on('connection', (client) => {
      clientsList[client.id] = client;
      dialogue.server('info', 'socket', `client connected : ${client.id}`);

      routes.api(client);
      routes.errors(client);

      // setTimeout(() => {
      //   // If the socket didn't authenticate, disconnect it
      //   userManagement
      //     .getUserDataFromClientId(client.id)
      //     .catch(() => {
      //       dialogue.server('info', 'socket', `client disconnected : ${client.id}`);
      //       closeOneSocket(client);
      //     });
      // }, 2000);

      client.on('disconnect', () => {
        userManagement
          .disconnectUserWithClientId(client.id)
          .then(() => {
            delete clientsList[client.id];
            dialogue.server('info', 'socket', `client disconnected : ${client.id}`);
          })
          .catch(() => {
            delete clientsList[client.id];
            dialogue.server('info', 'socket', `client disconnected : ${client.id}`);
          });
      });
    });
  }
}
