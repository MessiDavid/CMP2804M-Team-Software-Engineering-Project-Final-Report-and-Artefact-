import mongoose, { model } from "mongoose";
const { Schema } = mongoose;

const OrderSchema = new Schema({
  _id: {
    type: String,
    required: false,
  },
  orderid: {
    type: String,
    required: true,
  },
  workid: {
    type: String,
    required: true,
  },
  seller: {
    type: String,
    required: true,
  },
  sellerAddress: {
    type: String,
    required: false,
  },
  buyer: {
    type: String,
    required: true,
  },
  buyerAddress: {
    type: String,
    required: false,
  },
  orderType: {
    type: Number,
    required: false,
  },
  price: {
    type: Number,
    required: false,
  },
  effectiveDate: {
    type: Number,
    required: false,
  },
  expiryDate: {
    type: Number,
    required: false,
  },
  createdAt: {
    type: Number,
    required: false,
  },
  orderStage: {
    type: Number,
    required: false,
  },
  orderStatus: {
    type: Number,
    required: false,
  },
  sellerSignedAt: {
    type: Number,
    required: false,
  },
  paymentMethod: {
    type: Number,
    required: false,
  },
  signedTx: {
    type: Object,
    required: false,
  },
  unsignedTx: {
    type: Object,
    required: false,
  },
  qrCode: {
    type: String,
    required: false,
  },
  contributors: [{ userid: String }],
  votes: [{ userid: String }],
});

export default mongoose.model("Order", OrderSchema);
