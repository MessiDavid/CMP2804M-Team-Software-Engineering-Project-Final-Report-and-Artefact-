import { networkInterfaces } from "os";

export const getIp = () => {
  var interfaces = networkInterfaces();

  for (var dev in interfaces) {
    let iface = interfaces[dev];

    for (let i = 0; i < iface.length; i++) {
      let { family, address, internal } = iface[i];

      if (family === "IPv4" && address !== "127.0.0.1" && !internal) {
        return address;
      }
    }
  }
};
