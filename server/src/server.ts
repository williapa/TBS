// server.ts is the top level, which starts the express app server
// see app.ts for definition of routes, additional configuration 
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { registerGameSockets } from './sockets/gamesocket.js';

const PORT = 8420; // often, process.env.port || 8420;

const startServer = async () => {
  try {
    const httpServer = http.createServer(app);
    
    const io = new Server(httpServer, {
      cors: {
        origin: 'http://localhost:3000'
      }
    });

    registerGameSockets(io);

    httpServer.listen(PORT, () => {
      console.log(`server running on localhost:${PORT}`);
    });
  } catch (err) {
    console.error('failed to start server: ', err);
    process.exit(1);
  }
};

startServer();

// games
  // /createGame (POST) DONE, valid
  // /joinGame (POST) DONE (couldn't test bc can't view game)
  // /listGames (GET) DONE, valid
  // /game/{id} (GET) 

// maps
  // /createMap (POST) DONE, valid
  // /listMaps (GET) DONE, valid

// user
  // /createUser (POST) DONE valid
  // /user/{email} (GET) DONE valid

// routes to be REPLACED W/ WEBSOCKET.IO

  // /game/{id} (GET) - on join (in case you left & are returning, or for viewers joining)
  // /game/{id}/events (GET) - on join (& broadcast at start)
  // /updateGame (POST) - broadcast to entire room on success, clients apply events

/*
"target": "ES2022",
"module": "NodeNext",
"moduleResolution": "NodeNext",
"esModuleInterop": true,
"allowSyntheticDefaultImports": true,
"forceConsistentCasingInFileNames": true,
"strict": true,
"noImplicitAny": true,
"skipLibCheck": true,
"outDir": "./dist",
"rootDir": "./src",
"sourceMap": true,
"noEmitOnError": true
*/