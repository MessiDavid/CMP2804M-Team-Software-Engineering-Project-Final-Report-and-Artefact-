import ServerError from "../lib/errorHandler";
import jwt from "jsonwebtoken";
import { secret } from "../config";

export default async (ctx, next) => {
  let token = ctx.request.header["authorization"];

  if (!token) throw new ServerError("unauthorized!", 401);

  if (token.startsWith("Bearer")) {
    token = token.substring(7);
  }

  const decoded = jwt.verify(token, secret);

  if (!decoded) throw new ServerError("not found token", 401);

  if (decoded.exp < new Date().getTime()) {
    throw new ServerError("token invalid", 401);
  }
  // inorder to use the account directly, give the value to ctx.state
  ctx.state.token = decoded;
  ctx.state.originaltoken = token;

  await next();
};
