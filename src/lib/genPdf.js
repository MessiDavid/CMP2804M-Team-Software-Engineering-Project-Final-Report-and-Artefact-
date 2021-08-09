import { networkInterfaces } from "os";
import moment from "moment";
import pdf from "pdfkit";
import fs from "fs";
import path from "path";

export const genPdf = (order) => {
  let str = ``;
  Object.keys(order).map((key) => {
    let value = order[key],
      step = 40;

    if (["createdAt", "effectiveDate", "expiryDate"].includes(key)) {
      value = moment(value).format("YYYY-MM-DD HH:mm:ss");
    }
    // step is the count of words each line can be adjusted
    let valueData = ``;
    if (value.length > step) {
      for (let i = 1; i * step <= value.length + step; i++) {
        valueData += value.substring((i - 1) * step, i * step) + "\n";
      }
    } else {
      valueData += value + "\n";
    }
    str += key + ":" + valueData + "\n";
  });
  const doc = new pdf();

  doc.pipe(
    fs.createWriteStream(
      path.join(__dirname, "../../pdf", `${order.orderid}.pdf`)
    )
  );
  doc.text(`${str}`, 100, 100);
  doc.end();
};
