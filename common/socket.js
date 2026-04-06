<<<<<<< HEAD
import { Server } from 'socket.io';
let io;
export function init(server) {
    io = new Server(server,  {
        cors: "*"
    });
    return io;
}
export function getIO() {
    if (!io)
        throw Error("not valid IO");
    return io;
=======
import { Server } from 'socket.io';
let io;
export function init(server) {
    io = new Server(server,  {
        cors: "*"
    });
    return io;
}
export function getIO() {
    if (!io)
        throw Error("not valid IO");
    return io;
>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
}