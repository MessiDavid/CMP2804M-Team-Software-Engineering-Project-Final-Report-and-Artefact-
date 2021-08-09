import { ordersModel } from "../../models";
import ServerError from "../../lib/errorHandler";

export default async (ctx) => {
  const { workid } = ctx.request.params;
  if (!workid) {
    throw new ServerError("missing the required params");
  }

  let checkOrder = await ordersModel.find({
    workid,
    orderStatus: 0,
    orderStage: 3,
  });

  if (checkOrder && checkOrder.length > 0) {
    ctx.body = {
      status: 200,
      msg: "true",
    };
  } else {
    ctx.body = {
      status: 200,
      msg: "false",
    };
  }
};
