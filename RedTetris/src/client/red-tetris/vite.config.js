export default {
    server: {
      proxy: {
        "/socket.io": {
          target: "http://localhost:3000",
          ws: true, // Proxy WebSocket
          changeOrigin: true,
        },
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  };
  