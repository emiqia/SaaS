# Silence as a Service — Aplicación Cliente

Aplicación que muestra en tiempo real el estado ambiental y el aforo de las salas de la biblioteca UFRO, consumiendo la telemetría publicada por el nodo ESP32 a través de la plataforma ThingsBoard.

Proyecto desarrollado para el curso Internet de las Cosas (ICC153-1) — Universidad de La Frontera.

## Stack

- React
- Vite
- Consumo directo de la API REST de ThingsBoard (sin backend propio)

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- npm (viene incluido con Node.js)

## Instalación

Clona el repositorio y entra a la carpeta del proyecto:

```bash
git clone https://github.com/emiqia/SaaS.git
cd SaaS/saas-app
```

Instala las dependencias:

```bash
npm install
```

## Configuración

La aplicación consume la API REST de ThingsBoard. Por defecto apunta a:

```
http://200.13.5.20:8080
```

Si el servidor de ThingsBoard cambia de dirección, o si se quiere apuntar a una instancia propia, hay que actualizar la URL base en el código fuente dentro de `src/` (archivo de servicio/configuración de la API).

## Correr en modo desarrollo

```bash
npm run dev
```

Esto levanta un servidor local en:

```
http://localhost:5173
```

Ábrelo en el navegador para ver el dashboard en vivo.

## Generar build de producción

```bash
npm run build
```

Los archivos optimizados quedan en la carpeta `dist/`.

## Notas

- La aplicación requiere que el dispositivo ESP32 (o al menos la plataforma ThingsBoard) esté enviando telemetría activa para mostrar datos reales; sin conexión al backend, la interfaz puede cargar sin datos o mostrar error de conexión.
- Los datos se actualizan automáticamente cada 30 segundos.
- Ver el informe del proyecto para el detalle completo de la arquitectura (capas de percepción, network, middleware y aplicación).
