import * as orders from "../controllers/orders";
import userAuth from "../middlewares/auth";

export default (router) => {
  router
    .post("/orders", userAuth, orders.create)
    .get("/orders/buyer", userAuth, orders.query.getBuyerOrders)
    .get("/orders/seller", userAuth, orders.query.getSellerOrders)
    .get("/orders/info/:orderid", userAuth, orders.query.getOrder)
    .put("/orders/info/:orderid", userAuth, orders.info)
    .get("/orders/info", userAuth, orders.query.getAllOrder)
    .get("/orders/paypalid/:orderid", userAuth, orders.query.checkpaypalid)
    .get("/orders/orderid/:paypalOrderid", userAuth, orders.query.checkOrderid)
    .put("/orders/approve/:orderid", userAuth, orders.approve)
    .put("/orders/vote/:orderid", userAuth, orders.vote)
    .put("/orders/sign-by-seller/:orderid", userAuth, orders.signBySeller)
    .put("/orders/settle-by-buyer/:orderid", userAuth, orders.settleByBuyer)
    .put("/orders/sign-by-buyer/:orderid", userAuth, orders.signByBuyer)
    .put("/orders/check", orders.check)
    .get("/orders/checkSign/:workid", orders.checkSign);
};
