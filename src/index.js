import Koa from "koa";
import Router from "koa-router";
import { chatRouter, ordersRouter, paymentsRouter } from "./routes";
import bodyparser from "koa-bodyparser";
import cors from "@koa/cors";
import db from "./mongodb/db";
import fs from "fs";
import path from "path";
import errorMiddleware from "./middlewares/error";
import https from "https";
import sslify from "koa-sslify";

const app = new Koa();
const router = new Router();

chatRouter(router);
ordersRouter(router);
paymentsRouter(router);

app.use(cors());
app.use(errorMiddleware);
app.use(
  bodyparser({
    enableTypes: ["json", "from", "text"],
  })
);
app.use(router.routes());
app.use(router.allowedMethods());

// production
app.use(sslify());

const options = {
  cert: fs.readFileSync(
    path.join(__dirname, "../src/config/ssl_cert/fullchain.pem")
  ),
  key: fs.readFileSync(
    path.join(__dirname, "../src/config/ssl_cert/privkey.pem")
  ),
};

const server = https.createServer(options, app.callback()).listen(8000, () => {
  console.log(`https://localhost:8000`);
});

// http;
// const server = app.listen(8000, () => {
//   console.log(`http://localhost:8000`);
// });
export default server;
