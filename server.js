import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Servir els arxius estàtics de la carpeta dist
app.use(express.static(path.join(__dirname, 'dist')));

// Redirigir qualsevol altra petició al fitxer index.html (compatible amb Express 5)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de Node.js actiu a http://localhost:${PORT}`);
});