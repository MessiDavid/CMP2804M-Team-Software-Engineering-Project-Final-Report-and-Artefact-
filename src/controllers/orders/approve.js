import { ordersModel, chatModel } from "../../models";
import ServerError from "../../lib/errorHandler";
import { validationExpiryDate } from "./util";
import get from "lodash/get";
import { blockChainServerWorks, blockChainServerAuth } from "../../config";

export default async (ctx) => {
  const { userid, address } = ctx.state.token,
    { orderid } = ctx.request.params,
    { password } = ctx.request.body,
    originaltoken = ctx.state.originaltoken;

  if (!orderid) {
    throw new ServerError("not pass orderid");
  }

  let order = await ordersModel.findById(orderid);
  if (!order) {
    throw new ServerError("not found the order");
  }

  const {
    orderStatus,
    seller,
    orderStage,
    orderType,
    workid,
    expiryDate,
    buyerAddress,
    price,
    effectiveDate,
  } = order;

  // const pdfData = {
  //   orderid,
  //   workid,
  //   buyer: userid,
  //   seller,
  //   createdAt,
  //   effectiveDate,
  //   expiryDate,
  //   orderType,
  //   price,
  // };
  // genPdf(pdfData);

  if (orderStatus !== 0) {
    throw new ServerError("dialogMsg.chat.inactive");
  }

  if (userid != seller) {
    throw new ServerError(
      "the userid is not related to the seller, yous should go with the seller's token"
    );
  }

  if (orderStage !== 1) {
    throw new ServerError(
      "buyer didn't update the terms, you should call the orders/info api to update the orderStage == 1"
    );
  }

  if (orderType === 0) {
    const orders = await ordersModel.find({
      orderStatus: 1,
      orderType: 1,
      workid,
    });
    // check if it exist other orders with the same workid
    if (orders && orders.length > 0) {
      for (let i = 0; i < orders.length; i++) {
        let _order = orders[i];
        if (_order.expiryDate) {
          if (validationExpiryDate(_order.expiryDate)) {
            await ordersModel
              .findByIdAndUpdate(
                _order.orderid,
                {
                  orderStatus: 3,
                },
                { new: true }
              )
              .exec();
          } else {
            throw new ServerError("dialogMsg.chat.licensed");
          }
        }
      }
    }
  }
  // let keys;
  // try {
  //   keys = await axios({
  //     method: "post",
  //     url: `${blockChainServerAuth}/auth/key-pair`,
  //     headers: {
  //       authorization: originaltoken,
  //     },
  //     data: {
  //       password,
  //     },
  //   });
  // } catch (err) {
  //   throw new ServerError("cannot get the key-pair", 400, err);
  // }

  // if (!keys || !keys.data) {
  //   throw new ServerError(
  //     "key pair not exist, cannot get the keys by calling /auth/key-pair"
  //   );
  // }
  // const { privateKey } = keys.data;

  //get the chats of the orderid
  // const resultChats = await chatModel
  //   .find({ orderid }, { _id: 0, __v: 0 })
  //   .exec();
  // console.log("resultChats", resultChats);
  // genChatPdf(resultChats);

  //create the unsignedTx on blockchain

  // const url = `${blockChainServerWorks}/works/order`,
  //   data = {
  //     workid,
  //     orderid,
  //     buyerAddress,
  //     sellerAddress: address,
  //     orderType,
  //     price,
  //     effectiveDate,
  //     expiryDate,
  //     sellerPrivateKey: privateKey,
  //     contract,
  //     chatRecord,
  //   };

  // let unsignedTx;
  // try {
  //   unsignedTx = await axios({
  //     method: "post",
  //     url,
  //     data,
  //   });
  // } catch (err) {
  //   throw new ServerError("incorrect standard of req body", 400, err);
  // }

  // const _unsignedTx = get(unsignedTx, "data.data.unsignedTx", null);

  // if (!unsignedTx || !_unsignedTx) {
  //   throw new ServerError(
  //     "failed to get the unsignedTx by calling /works/order, please check if the work is illegal"
  //   );
  // }

  // if (!_unsignedTx.id || !_unsignedTx.inputs || !_unsignedTx.outputs) {
  //   throw new ServerError(
  //     "the unsignedTx return from /works/order is null, please check if the work is fulfil the requirments of blockchain"
  //   );
  // }

  const result = await ordersModel
    .findByIdAndUpdate(
      orderid,
      {
        orderStage: 2,
        sellerAddress: address,
        updatedAt: new Date().getTime(),
      },
      { new: true }
    )
    .exec();

  const { _id, ...rest } = result.toObject({ getters: true });
  ctx.body = {
    data: rest,
  };
};
