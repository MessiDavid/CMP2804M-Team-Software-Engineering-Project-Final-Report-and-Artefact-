import { ordersModel } from "../../models";
import ServerError from "../../lib/errorHandler";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import omit from "lodash/omit";
import { blockChainServerAuth } from "../../config";
import { isInteger } from "lodash";
import { getArtwork, addAgent } from "../../services/query";
import { uuid } from "../../lib/uuid";

export default async (ctx) => {
  const { userid } = ctx.state.token,
    { workid, contributors } = ctx.request.body,
    isProd = process.env.NODE_ENV == "production";

  if (!workid) {
    throw new ServerError("missing the required request body");
  }

  let work;
  try {
    work = await getArtwork(workid);
  } catch (err) {
    throw new ServerError(err.message, 400, err);
  }

  if (!work) {
    throw new ServerError("cannot get the workidAddress");
  }
  if (!work.data) {
    throw new ServerError("no work.data");
  }

  const { workInfo, ownerAddress } = work.data;
  if (!workInfo) {
    throw new ServerError("missing the workInfo");
  }
  const { artworkTitle } = JSON.parse(workInfo);
  if (!artworkTitle) {
    throw new ServerError("missing the artWorkTitle");
  }

  let owner;
  try {
    owner = await axios({
      methos: "get",
      url: `${blockChainServerAuth}/auth/userid/${ownerAddress}`,
      // httpsAgent: addAgent(),
    });
  } catch (err) {
    throw new ServerError(err.message, 400, err);
  }
  if (!owner) {
    throw new ServerError("cannot get the ownerid");
  }
  const ownerid = owner.data.userid;

  // feat: contributors vote to aggree the payments
  // let _contributors;
  // if (contributors) {
  //   _contributors = contributors.map((i) => ({ userid: i }));
  // }

  // check that the orderStatus == 0 Active for the same buyer, seller, workid
  if (isProd) {
    let checkOrder = await ordersModel.find({
      buyer: userid,
      seller: ownerid,
      workid,
      orderStatus: 0,
    });
    if (checkOrder && checkOrder.length) {
      throw new ServerError(
        "There is an outstanding active order for the same work. "
      );
    }
  }

  const id = uuidv4();
  let order = await ordersModel.create({
    _id: id,
    orderid: id,
    workid,
    // ...data,
    buyer: userid,
    seller: ownerid,
    createdAt: new Date().getTime(),
    orderStage: 0,
    orderStatus: 0,
    // contributors: _contributors,
  });

  if (!order) {
    throw new ServerError(
      "failed to create the orders, please check the ordersModel"
    );
  }

  let notificationData = {
    notificationType: 14,
    artworkTitle,
    buyerid: userid,
    sellerid: ownerid,
    orderid: id,
    createdAt: new Date().getTime(),
    skipEmail: false,
  };
  if (!isProd) {
    notificationData.skipEmail = true;
  }

  let notification;
  try {
    notification = await axios({
      method: "post",
      url: `${blockChainServerAuth}/notifications`,
      data: notificationData,
      // httpsAgent: addAgent(),
    });
  } catch (err) {
    throw new ServerError(err.message, 400, err);
  }

  if (notification.status !== 200) {
    throw new ServerError(
      "failed to create the orders, please check the request body of api notification"
    );
  }

  const { _id, _v, ...rest } = order.toObject({ getters: true });

  ctx.body = {
    status: 200,
    data: rest,
  };
};
