import { io } from 'socket.io-client';

let socket;
let connectedToken;

function socketOrigin() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return window.location.origin;
}

export function getSocket() {
  const token = localStorage.getItem('derrsc_token');
  if (!token) return null;
  if (!socket || connectedToken !== token) {
    socket?.disconnect();
    connectedToken = token;
    socket = io(socketOrigin(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
  }
  return socket;
}

export function subscribeSocket(event, handler) {
  const activeSocket = getSocket();
  if (!activeSocket) return () => {};
  activeSocket.on(event, handler);
  return () => activeSocket.off(event, handler);
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = undefined;
  connectedToken = undefined;
}
