import { Server } from 'socket.io';

export function init(server) {
  const allowedOrigins = [
    ...String(process.env.FRONTEND_URL || '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean),
  ];

  return new Server(server, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });
}
