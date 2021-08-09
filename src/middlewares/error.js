import ServerError from "../lib/errorHandler";

export default async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.log(error);
    const { status, message } = error;
    if (error instanceof ServerError) {
      // the error of code
      ctx.status = status || 500;
      ctx.body = {
        message,
      };
    } else {
      // the error of server
      ctx.status = 500;
      ctx.body = {
        message: "server error",
        error,
      };
    }
  }
};
