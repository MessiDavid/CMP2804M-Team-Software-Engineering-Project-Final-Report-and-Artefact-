import { ordersModel } from "../../models";
import ServerError from "../../lib/errorHandler";
import { validationExpiryDate } from "./util";

export default async (ctx) => {
  const { userid, address } = ctx.state.token,
    { orderid } = ctx.request.params,
    { price, orderType, effectiveDate, expiryDate } = ctx.request.body;

  const data = ctx.request.body;

  if (!orderid) {
    throw new ServerError("not pass orderid");
  }

  // verify the required request body
  if (
    typeof orderType === "undefined" ||
    typeof price === "undefined" ||
    !effectiveDate
  ) {
    throw new ServerError("request is missing parameters");
  }

  if (price < 0) {
    throw new ServerError("price should be positive");
  }

  const priceDecimal = price.toString().split(".");
  if (priceDecimal[1] && priceDecimal[1].length > 2) {
    throw new ServerError("the decimal should be less than 2 digit");
  }

  if (orderType > 1 || orderType < 0) {
    throw new ServerError("orderType should be 0 or 1");
  }

  if (orderType === 1 && !expiryDate) {
    throw new ServerError("please input the expiryDate");
  }

  if (
    orderType === 1 &&
    expiryDate < new Date().getTime() &&
    expiryDate < effectiveDate
  ) {
    throw new ServerError("the expiryDate is invalid");
  }

  // search the info
  let order = await ordersModel.findById(orderid);

  if (order.createdAt > effectiveDate) {
    throw new ServerError("effectiveDate should more than createdAt");
  }

  // step0: if not found order
  if (!order) {
    throw new ServerError("not found the order");
  }

  // step1: if its not active
  if (order.orderStatus !== 0) {
    throw new ServerError("dialogMsg.chat.inactive");
  }

  // step2：if its not the buyer
  if (userid !== order.buyer) {
    throw new ServerError(
      "the userid is not related to the buyer, please call with buyer's token"
    );
  }

  // step3：check if there is anyone was licensed with this artwork
  if (orderType === 0) {
    const workid = order.workid;
    const orders = await ordersModel.find({
      orderStatus: 1,
      orderType: 1,
      workid: workid,
    });
    // if it exists
    if (orders && orders.length > 0) {
      for (let i = 0; i < orders.length; i++) {
        let _order = orders[i];
        if (_order.expiryDate) {
          if (validationExpiryDate(_order.expiryDate)) {
            await ordersModel
              .findByIdAndUpdate(_order.orderid, {
                orderStatus: 3,
              })
              .exec();
          } else {
            throw new ServerError("dialogMsg.chat.licensed");
          }
        }
      }
    }
  }

  const updateData = {
    ...data,
    buyerAddress: address,
    orderStage: 1,
    updatedAt: new Date().getTime(),
  };
  const result = await ordersModel
    .findByIdAndUpdate(orderid, updateData, { new: true })
    .exec();

  const { _id, ...rest } = result.toObject({ getters: true });
  ctx.body = {
    data: rest,
  };
};
