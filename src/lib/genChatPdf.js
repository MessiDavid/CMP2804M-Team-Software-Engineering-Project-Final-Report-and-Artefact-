import { networkInterfaces } from "os";
import moment from "moment";
import pdf from "pdfkit";
import fs from "fs";
import path from "path";

export const genChatPdf = (chat) => {
  // const chat = [
  //   {
  //     message: "I am here",
  //     sender: "user5",
  //     createdAt: 1612239157335,
  //     orderid: "sdfsdfsdf",
  //   },
  //   {
  //     message: "I am here too",
  //     sender: "user5",
  //     createdAt: 1612197893657,
  //     orderid: "sfsdfasdfasd",
  //   },
  // ];
  let str = ``;

  chat.map((msg) => {
    const msgPdf = JSON.parse(JSON.stringify(msg));
    let step = 30;
    // 针对message长度 做分割 如果说的内容太多 分行展示 15是假定值自行调整
    msgPdf.createdAt = moment(msgPdf.createdAt).format("YYYY-MM-DD HH:mm:ss");
    // 自行替换
    let message = "";
    const row = msgPdf.createdAt + msg.sender + ":" + msg.message;
    if (row.length > step) {
      for (let i = 1; i * step < row.length + step; i++) {
        message += row.substring((i - 1) * step, i * step) + "\n" + "\n";
      }
    } else {
      message += row + "\n";
    }
    str += message + "\n";
  });
  const doc = new pdf();
  doc.pipe(
    fs.createWriteStream(
      path.join(__dirname, "../../pdf", `${chat[0].orderid}Chat.pdf`)
    )
  );
  doc.text(`${str}`, 100, 100);
  doc.end();
};
