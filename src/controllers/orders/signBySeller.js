import { ordersModel } from "../../models";
import axios from "axios";
import ServerError from "../../lib/errorHandler";
import {
  blockChainServerTx,
  blockChainServerAuth,
  blockChainServerWorks,
} from "../../config";
import get from "lodash/get";
import { validationExpiryDate } from "./util";
import { getArtwork, addAgent } from "../../services/query";
import JSONbig from "json-bigint";

export default async (ctx) => {
  const { userid } = ctx.state.token,
    originaltoken = ctx.state.originaltoken,
    { publicKey, privateKey, contract, chatRecord } = ctx.request.body,
    { orderid } = ctx.request.params,
    isProd = process.env.NODE_ENV === "production";

  if (!privateKey || !publicKey) {
    throw new ServerError("should pass key as req body");
  }
  if (!orderid) {
    throw new ServerError("not pass orderid");
  }
  const order = await ordersModel.findById(orderid);
  if (!order) {
    throw new ServerError("the order you query cannot find!");
  }

  const {
    orderStatus,
    seller,
    buyer,
    buyerAddress,
    sellerAddress,
    orderStage,
    orderType,
    workid,
    expiryDate,
    price,
    effectiveDate,
    unsignedTx,
    createdAt,
  } = order;

  if (orderStatus !== 0) {
    throw new ServerError("dialogMsg.chat.inactive");
  }

  if (userid !== seller) {
    throw new ServerError(
      "the userid is not related to the seller, yous should go with the seller's tokenr"
    );
  }

  if (orderStage !== 2) {
    throw new ServerError("dialogMsg.chat.noApproved");
  }

  if (orderType === 0) {
    const orders = await ordersModel.find({
      orderStatus: 1,
      orderType: 1,
      workid,
    });
    const signedOrders = await ordersModel.find({
      orderStage: 3,
      workid,
    });

    if (signedOrders && signedOrders.length > 0) {
      throw new ServerError("dialogMsg.chat.sellerSigned");
    }

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
            break;
          }
        }
      }
    }
  }

  if (!orderType && !price && effectiveDate < new Date().getTime()) {
    throw new ServerError(
      "please check if the orderType, price is null or effectiveDate before now"
    );
  }

  if (expiryDate && expiryDate < effectiveDate) {
    throw new ServerError("expirdate exceeds the effectiveDate");
  }

  // //call Block chain API /works/order to get the unsignTx and set it to unsignedTx.
  // const keys = await axios({
  //   method: "get",
  //   url: `${blockChainServerAuth}/auth/key-pair`,
  //   headers: {
  //     authorization: originaltoken,
  //   },
  // });

  // if (!keys || !keys.data) {
  //   throw new ServerError(
  //     "key pair not exist, cannot get the keys by calling /auth/key-pair"
  //   );
  // }
  // const { publicKey, privateKey } = keys.data;

  const url = `${blockChainServerWorks}/works/order`,
    // const url = "http://10.6.72.80:8041/works/order",
    data = {
      workid,
      orderid,
      buyerAddress,
      sellerAddress,
      orderType,
      price,
      effectiveDate,
      expiryDate,
      sellerPrivateKey: privateKey,
      contract,
      chatRecord,
    };

  let newUnsignedTx;
  try {
    newUnsignedTx = await axios({
      method: "post",
      url,
      // httpsAgent: addAgent(),
      data,
    });
  } catch (err) {
    throw new ServerError(err.message, 400, err);
  }

  const _newUnsignedTx = get(newUnsignedTx, "data.data.unsignedTx", null);

  if (!newUnsignedTx || !_newUnsignedTx) {
    throw new ServerError(
      "failed to get the unsignedTx by calling /works/order, please check if the work is illegal"
    );
  }

  if (!_newUnsignedTx.id || !_newUnsignedTx.inputs || !_newUnsignedTx.outputs) {
    throw new ServerError("dialogMsg.chat.cannotSign");
  }

  const _data = { publicKey, privateKey, unsignedTx: _newUnsignedTx };

  let signedTx;
  try {
    signedTx = await axios({
      method: "post",
      url: blockChainServerTx + "/tx/sign",
      // httpsAgent: addAgent(),
      data: _data,
    });
  } catch (err) {
    throw new ServerError(err.message, 500, err);
  }

  const _signedTx = get(signedTx, "data.signedTx", null);

  if (!signedTx || !_signedTx) {
    throw new ServerError(
      "failed to get the unsignedTx by calling /tx/sign, please check if the work is illegal"
    );
  }

  if (!_signedTx.id || !_signedTx.inputs || !_signedTx.outputs) {
    throw new ServerError(
      "the unsignedTx return from /tx/sign is null, please check if the work is fulfil the requirments of blockchain"
    );
  }

  const result = await ordersModel
    .findByIdAndUpdate(
      orderid,
      {
        sellerSignedAt: new Date().getTime(),
        orderStage: 3,
        unsignedTx: _signedTx,
        updatedAt: new Date().getTime(),
      },
      { new: true }
    )
    .exec();

  let work;
  try {
    work = await getArtwork(workid);
  } catch (err) {
    throw new ServerError(err.message, 500, err);
  }

  if (!work) {
    throw new ServerError("cannot get the work by call /works api ");
  }
  const { workInfo } = work.data,
    { artworkTitle } = JSON.parse(workInfo);

  let notificationData = {
    notificationType: 15,
    artworkTitle,
    buyerid: buyer,
    sellerid: seller,
    orderid,
    orderType,
    createdAt,
    effectiveDate,
    expiryDate,
    sellerSignedAt: new Date().getTime(),
    price,
    skipEmail: false,
  };
  if (!isProd) {
    notificationData.skipEmail = true;
  }

  await axios({
    method: "post",
    url: `${blockChainServerAuth}/notifications`,
    // httpsAgent: addAgent(),
    data: notificationData,
  });
  // // run this time task to check if this order canelled within 24 hours
  // const rule = new schedule.RecurrenceRule();
  // const times = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56];
  // rule1.second = times;
  // // run it every 5 mins
  // var j = schedule.scheduleJob(rule, async () => {
  //   if (
  //     order.orderStatus == 0 &&
  //     order.orderStage == 3 &&
  //     order.sellerSignedAt < 24
  //   ) {
  //     await ordersModel.findByIdAndUpdate(order._id, {
  //       orderStage: 1,
  //     });
  //     // cancel this time after finished
  //   }
  // });
  const { _id, ...rest } = result.toObject({ getters: true });

  ctx.body = {
    data: rest,
  };
};
