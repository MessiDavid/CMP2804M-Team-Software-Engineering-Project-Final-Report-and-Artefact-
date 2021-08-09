import { ordersModel, paymentsModel } from "../../models";
import axios from "axios";
import { blockChainServerAuth } from "../../config";
import ServerError from "../../lib/errorHandler";
import { checkAN } from "../../services/query";

export const getBuyerOrders = async (ctx) => {
  const { userid } = ctx.state.token;

  const _query = {
    orderStatus: 0,
    orderStage: 3,
    sellerSignedAt: {
      $lt: new Date().getTime() - 24 * 60 * 60 * 1000,
    },
  };
  await ordersModel.updateMany(_query, { orderStage: 1 }).exec();

  const query = {
    buyer: userid,
    orderStatus: 1,
    orderType: 1,
    expiryDate: {
      $lt: new Date().getTime(),
    },
  };
  await ordersModel.updateMany(query, { orderStatus: 3 });

  const orders = await ordersModel.find({ buyer: userid }).exec();

  ctx.body = {
    data: orders,
  };
};

export const getSellerOrders = async (ctx) => {
  const { userid } = ctx.state.token;

  const _query = {
    orderStatus: 0,
    orderStage: 3,
    sellerSignedAt: {
      $lt: new Date().getTime() - 24 * 60 * 60 * 1000,
    },
  };
  await ordersModel.updateMany(_query, { orderStage: 1 }).exec();

  const query = {
    seller: userid,
    orderStatus: 1,
    orderType: 1,
    expiryDate: {
      $lt: new Date().getTime(),
    },
  };
  await ordersModel.updateMany(query, { orderStatus: 3 }).exec();

  const orders = await ordersModel.find({ seller: userid }).exec();

  ctx.body = {
    data: orders,
  };
};

export const getOrder = async (ctx) => {
  const { orderid } = ctx.request.params;

  const orders = await ordersModel.findById(orderid).exec();

  ctx.body = {
    data: orders,
  };
};

export const getAllOrder = async (ctx) => {
  const { originaltoken } = ctx.state;

  await checkAN(originaltoken);

  const orders = await ordersModel.find().exec();

  ctx.body = {
    data: orders,
  };
};

export const checkpaypalid = async (ctx) => {
  const { originaltoken } = ctx.state,
    { orderid } = ctx.request.params;
  await checkAN(originaltoken);
  const order = await paymentsModel.find({ orderid }).exec();
  if (!order && order.length == 0) {
    throw new ServerError("cannot find the order");
  }
  let result = [];
  order.forEach((n) => {
    result.push(n.paypalOrderid);
  });
  ctx.body = {
    data: { paypalOrderid: result },
  };
};

export const checkOrderid = async (ctx) => {
  const { originaltoken } = ctx.state,
    { paypalOrderid } = ctx.request.params;
  await checkAN(originaltoken);

  const order = await paymentsModel.find({ paypalOrderid }).exec();

  if (!order) {
    throw new ServerError("cannot find the order");
  }
  ctx.body = {
    data: { orderid: order[0] },
  };
};
