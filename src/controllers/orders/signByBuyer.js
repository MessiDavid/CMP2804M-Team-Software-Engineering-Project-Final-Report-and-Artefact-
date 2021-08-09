import { ordersModel, paymentsModel } from "../../models";
import ServerError from "../../lib/errorHandler";
import {
  blockChainServerWorks,
  blockChainServerAuth,
  paypal_dev_client_id,
  paypal_dev_secret,
} from "../../config";
import axios from "axios";
import querystring from "querystring";
import { getArtwork, addAgent } from "../../services/query";

// /orders/sign-by-buyer/:orderid/
export default async (ctx) => {
  const isProd = process.env.NODE_ENV === "production",
    { userid } = ctx.state.token,
    { originaltoken } = ctx.state,
    { publicKey, privateKey } = ctx.request.body,
    { orderid } = ctx.request.params,
    order = await ordersModel.findById(orderid),
    { buyerAddress, paymentMethod } = order;

  if (!privateKey || !publicKey) {
    throw new ServerError("should pass key as req body");
  }
  if (!order) {
    throw new ServerError("not found the order!");
  }
  let paypalOrderid;
  if (isProd) {
    if (paymentMethod == 0) {
      const payment = await paymentsModel.findOne({ orderid });

      if (!payment) {
        throw new ServerError("not found the payments");
      }

      const { paypalStatus } = payment;
      paypalOrderid = payment.paypalOrderid;

      // paypalOrderid = payment.paypalOrderid;

      if (paypalStatus != "COMPLETED") {
        throw new ServerError("please complete payment first!");
      }
      // const { orderStatus } = fpsPayment.data;
    } else if (paymentMethod == 1) {
      const fpsPayment = await axios({
        method: "post",
        url: "https://localhost:8000/payments/fps/capture",
        // httpsAgent: addAgent(),
        data: {
          orderid,
          paymentType: 2,
        },
        headers: {
          authorization: originaltoken,
        },
      });

      if (!order) {
        throw new ServerError("fail to call the /fps/capture");
      }
      if (fpsPayment.data.data.orderStatus != "COMPLETED") {
        throw new ServerError("please complete payment first!");
      }
    }
  }
  // step2. requst the information of the /operations/confirmation

  // const { unsignedTx } = order;
  // console.log("unsignedTx", unsignedTx);

  // let confirmation = await axios({
  //   method: "post",
  //   url: blockChainServerWorks + "/operations/confirmation",
  //   httpsAgent: addAgent(),
  //   data: {
  //     signedTx: unsignedTx,
  //   },
  // });
  // console.log("confirmation", confirmation);
  // if (!confirmation) {
  //   throw new ServerError("confirmation fail!");
  // }

  const updatedorder = await ordersModel
    .findByIdAndUpdate(
      orderid,
      {
        orderStatus: 1,
        orderStage: 5,
        updatedAt: new Date().getTime(),
      },
      { new: true }
    )
    .exec();

  if (updatedorder.orderType === 0) {
    await ordersModel
      .updateMany(
        {
          workid: updatedorder.workid,
          orderStatus: 0,
          updatedAt: new Date().getTime(),
        },
        { orderStatus: 2 }
      )
      .exec();
  }

  const notificationResult = await ordersModel.find({
    workid: updatedorder.workid,
    orderStatus: 2,
  });

  const work = await getArtwork(updatedorder.workid);
  if (!work) {
    throw new ServerError("cannot get the work by call /works api ");
  }
  const { workInfo } = work.data,
    { artworkTitle } = JSON.parse(workInfo);

  let errorList = [];
  if (notificationResult) {
    for (let i = 0; i < notificationResult.length; i++) {
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
      } = notificationResult[i];
      const result = await axios({
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
      if (result.status !== 200) {
        errorList.push(notificationResult[i]);
      }
    }
  }
  if (errorList.length !== 0) {
    throw new ServerError("post /notifications with an error", 400, errorList);
  }

  const result = await ordersModel.findById(orderid),
    {
      orderStatus,
      workid,
      buyer,
      seller,
      orderType,
      createdAt,
      effectiveDate,
      expiryDate,
      sellerSignedAt,
      price,
    } = result;

  let notificationType;
  switch (orderType) {
    case 0:
      notificationType = 16;
      break;
    case 1:
      notificationType = 17;
      break;
  }
  const notification = await axios({
    method: "post",
    url: `${blockChainServerAuth}/notifications`,
    // httpsAgent: addAgent(),
    data: {
      notificationType,
      artworkTitle,
      buyerid: buyer,
      sellerid: seller,
      orderid,
      orderType,
      createdAt,
      effectiveDate,
      expiryDate,
      sellerSignedAt,
      price,
    },
  });

  if (notification.status !== 200) {
    throw new ServerError(
      "failed to create the orders, please check the request body of api notification"
    );
  }

  // const keys = await axios({
  //   method: "get",
  //   url: `${blockChainServerAuth}/auth/key-pair`,
  //   headers: {
  //     authorization: originaltoken,
  //   },
  // });

  // if (!keys || !keys.data) {
  //   throw new ServerError("key pair not exist");
  // }
  // const { publicKey, privateKey } = keys.data;

  const paypal = await axios({
    method: "POST",
    url: "https://api-m.sandbox.paypal.com/v1/oauth2/token",
    // httpsAgent: addAgent(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    auth: {
      username: paypal_dev_client_id,
      password: paypal_dev_secret,
    },
    data: querystring.stringify({
      grant_type: "client_credentials",
    }),
  });

  const paypalToken = paypal.data.access_token;
  let paypalData;
  if (isProd) {
    // const paymentid = paymentMethod == 0 ? { paypalOrderid } : { fpsOrderid };
    paypalData = {
      orderid,
      paypalOrderid,
      publicKey,
      privateKey,
      buyerAddress,
      paypalToken,
    };
  } else {
    paypalData = {
      orderid,
      orderStatus,
      publicKey,
      privateKey,
      buyerAddress,
      paypalToken,
    };
  }

  const awaitsome = (n = 2) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, n * 1000);
    });
  };

  await awaitsome(30);

  let paypalReceipt;
  try {
    paypalReceipt = await axios({
      method: "post",
      url: `${blockChainServerWorks}/works/order/receipt`,

      data: paypalData,
    });
  } catch (err) {
    throw new ServerError(err.message, 500, err);
  }

  if (!paypalReceipt) {
    throw new ServerError("failed to send paypalReceipt");
  }

  ctx.body = {
    data: result,
  };
};
