import { ordersModel } from "../../models";
import ServerError from "../../lib/errorHandler";

export default async (ctx) => {
  const { userid } = ctx.state.token;
  const { orderid } = ctx.request.params;

  const { contributors, votes } = await ordersModel.findById(orderid, [
    "contributors",
    "votes",
  ]);
  const has = contributors.map((i) => i.userid).includes(userid);
  if (!has) {
    throw new ServerError("you aren't the contributor so you can't vote");
  }
  const hasVoted = votes.map((i) => i.userid).includes(userid);
  if (hasVoted) {
    throw new ServerError("you have voted before");
  }
  votes.push({ userid });
  const result = await ordersModel
    .findByIdAndUpdate(orderid, { votes }, { new: true })
    .exec();
  if (votes.length === contributors.length) {
    const success = await ordersModel
      .findByIdAndUpdate(orderid, { orderStage: 6 }, { new: true })
      .exec();
    ctx.body = {
      status: 200,
      msg: "you have voted successfully and all contributors have finished",
    };
    return;
  }
  ctx.body = {
    status: 200,
    msg: "you have voted successfully and wait another contributor to vote",
  };
};
