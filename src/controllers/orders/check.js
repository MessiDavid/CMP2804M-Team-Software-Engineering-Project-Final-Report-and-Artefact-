import { ordersModel } from "../../models";
import ServerError from "../../lib/errorHandler";
import { blockChainServerAuth } from "../../config";
import axios from "axios";
import { getArtwork, addAgent } from "../../services/query";

export default async (ctx) => {
  const { workid } = ctx.request.body;
  if (!workid) {
    throw new ServerError("missing the required request body");
  }

  let checkOrder = await ordersModel.find({
    workid,
    orderStatus: 0,
  });

  const work = await getArtwork(workid);
  if (!work) {
    throw new ServerError("cannot find the work ");
  }
  const { workInfo } = work.data,
    { artworkTitle } = JSON.parse(workInfo);

  let errorList = [];
  if (checkOrder && checkOrder.length > 0) {
    for (let i = 0; i < checkOrder.length; i++) {
      const result = await ordersModel
        .findByIdAndUpdate(
          checkOrder[i].orderid,
          {
            orderStatus: 2,
          },
          { new: true }
        )
        .exec();
      const {
        notificationType = 18,
        buyer: buyerid,
        seller: sellerid,
        orderid,
        orderType,
        createdAt,
        effectiveDate,
        expiryDate,
        sellerSignedAt,
        price,
      } = result;
      const resultNotify = await axios({
        method: "post",
        url: `${blockChainServerAuth}/notifications`,
        // httpsAgent: addAgent(),
        data: {
          notificationType,
          artworkTitle,
          buyerid,
          sellerid,
          orderid,
          orderType,
          createdAt,
          effectiveDate,
          expiryDate,
          sellerSignedAt,
          price,
        },
      });
      console.log("resultNotify", resultNotify);
      if (resultNotify.status !== 200) {
        errorList.push(notificationResult[i]);
      }
    }
  }
  if (errorList.length !== 0) {
    throw new ServerError("post /notifications with an error", 400, errorList);
  }

  ctx.body = {
    status: 200,
    msg: "all the orders related to whe work become inactive",
  };
};
