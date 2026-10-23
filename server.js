const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

let ultimaMedicion = {
  rssi: 0,
  ping: 0,
  velocidad_kbps: 0,
  timestamp: Date.now(),
  wifi: ""
};

const clientes = new Set();

app.get('/api/comando', (req, res) => {
  res.json({ comando: "medir" });
});

app.post('/api/mediciones', (req, res) => {
  ultimaMedicion = {
    ...req.body,
    timestamp: Date.now()
  };
  
  console.log('📊 Medición recibida:', ultimaMedicion);
  
  clientes.forEach(cliente => {
    if (cliente.readyState === 1) {
      cliente.send(JSON.stringify({
        tipo: 'medicion',
        datos: ultimaMedicion
      }));
    }
  });
  
  res.json({ ok: true });
});

app.get('/api/mediciones', (req, res) => {
  res.json(ultimaMedicion);
});

app.get('/api/speedtest', (req, res) => {
  res.setHeader('Content-Type', 'application/octet-stream');
  
  let enviados = 0;
  const intervalo = setInterval(() => {
    if (enviados < 2000) {
      res.write(Buffer.alloc(1024));
      enviados++;
    } else {
      clearInterval(intervalo);
      res.end();
    }
  }, 2);
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('✓ Cliente WebSocket conectado');
  clientes.add(ws);
  
  ws.send(JSON.stringify({
    tipo: 'medicion',
    datos: ultimaMedicion
  }));
  
  ws.on('close', () => {
    console.log('✗ Cliente WebSocket desconectado');
    clientes.delete(ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});