import _uuid from "node-uuid";

export const uuid = () => {
  return _uuid.v4();
};

export const toBase64 = (value) => {
  var buffer = Buffer.alloc(16);
  _uuid.parse(value, buffer);
  return buffer
    .toString("base64")
    .substring(0, 22)
    .replace(/\//g, "a")
    .replace(/\+/g, "a")
    .replace(/\=/g, "a")
    .replace(/\==/g, "aa");
};
