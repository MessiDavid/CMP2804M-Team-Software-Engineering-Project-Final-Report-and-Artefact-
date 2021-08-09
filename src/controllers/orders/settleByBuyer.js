import { ordersModel } from "../../models";
import ServerError from "../../lib/errorHandler";
import axios from "axios";
import get from "lodash/get";
import {
  blockChainServerTx,
  blockChainServerAuth,
  blockChainServerWorks,
} from "../../config";
import { addAgent } from "../../services/query";

export default async (ctx) => {
  const { userid } = ctx.state.token,
    originaltoken = ctx.state.originaltoken,
    { publicKey, privateKey } = ctx.request.body,
    { orderid } = ctx.request.params;

  if (!privateKey || !publicKey) {
    throw new ServerError("should pass key as req body");
  }
  // search the order information
  let order = await ordersModel.findById(orderid);
  if (!order) {
    throw new ServerError("the order you query cannot find!");
  }
  const { orderStatus, buyer, orderStage, unsignedTx, sellerSignedAt } = order;

  // setp 1：if its not active
  if (orderStatus !== 0) {
    throw new ServerError("dialogMsg.chat.inactive");
  }

  // step 2：if its note the buyer
  if (userid !== buyer) {
    throw new ServerError(
      "the userid is not related to the buyer, yous should go with the buyer's token"
    );
  }

  if (orderStage !== 3) {
    throw new ServerError(
      "seller didn't sign the terms yet, you might check ifthe orderStage of this order == 3"
    );
  }

  const signOverdue = new Date().getTime() - sellerSignedAt;

  if (signOverdue > 24 * 60 * 60 * 1000) {
    order = await ordersModel
      .findByIdAndUpdate(
        orderid,
        { orderStage: 1, updatedAt: new Date().getTime() },
        { new: true }
      )
      .exec();
    throw new ServerError("this order was not paid within 24 hours");
  }

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
  // const { publicKey, privateKey } = keys.data,
  let signedTx;
  try {
    signedTx = await axios({
      method: "post",
      url: blockChainServerTx + "/tx/sign",
      // httpsAgent: addAgent(),
      data: {
        publicKey,
        privateKey,
        unsignedTx,
      },
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
      "the unsignedTx return from /tx/sign is null,passed wrong keys"
    );
  }

  const confirmation = await axios({
    method: "post",
    url: blockChainServerWorks + "/operations/confirmation",
    // httpsAgent: addAgent(),
    data: {
      signedTx: _signedTx,
    },
  });

  if (!confirmation) {
    throw new ServerError(
      "confirmation fail! faill to pass the confirmation by calling /operations/confirmation api"
    );
  }

  const updatedorder = await ordersModel
    .findByIdAndUpdate(
      orderid,
      {
        orderStage: 4,
        unsignedTx: _signedTx,
        updatedAt: new Date().getTime(),
      },
      { new: true }
    )
    .exec();

  const { _id, ...rest } = updatedorder.toObject({ getters: true });

  ctx.body = {
    data: rest,
  };
};
