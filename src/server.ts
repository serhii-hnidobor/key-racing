import express from "express";
import http from "http";
import { Server } from "socket.io";
import socketHandler from "./socket";
import routes from "./routes";
import { PORT, STATIC_PATH } from "./config";

const app = express();
const httpServer = new http.Server(app);
const socketIo = new Server(httpServer);

app.use(express.static(STATIC_PATH));

routes(app);

app.get("*", (req, res) => res.redirect("/login"));

socketHandler(socketIo);

httpServer.listen(3003, () => console.log(`Listen server on port ${PORT}`));

export default { app, httpServer };
