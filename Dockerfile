# Imatge oficial de Node.js 20 sobre Alpine Linux
FROM node:20-alpine

# Directori de treball dins del contenidor
WORKDIR /app

# Copiar els arxius de dependències
COPY package*.json ./

# Instal·lar totes les dependències
RUN npm ci

# Copiar tot el codi font del projecte
COPY . .

# Compilar la web amb Vite (genera la carpeta dist/)
RUN npm run build

# Exposar el port 5173
EXPOSE 5173

# Executar el servidor de Node.js en arrencar el contenidor
CMD ["npm", "start"]