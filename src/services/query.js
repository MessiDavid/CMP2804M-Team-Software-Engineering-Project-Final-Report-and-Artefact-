import axios from "axios";
import { blockChainServerWorks, blockChainServerAuth } from "../config";
import { rootCas } from "ssl-root-cas";
import path from "path";
import fs from "fs";
import https from "https";

export function getArtwork(workid) {
  // let rc = rootCas.create();
  // rc.addFile(path.resolve(__dirname, "../../src/config/chain.pem"));
  // const agent = new https.Agent({
  //   ca: rc,
  // });
  return axios({
    method: "get",
    url: `${blockChainServerWorks}/works/${workid}`,
    // httpsAgent: agent,
  });
}

export async function checkAN(originaltoken) {
  let user;
  try {
    user = await axios({
      methos: "get",
      url: `${blockChainServerAuth}/auth/user-info`,
      headers: {
        authorization: originaltoken,
      },
    });
  } catch (err) {
    throw new ServerError(err.message, 400, err);
  }
  if (!user) {
    throw new ServerError("cannot get the ownerid");
  }
  const roleType = user.data.roleType;
  if (roleType !== 0) {
    throw new ServerError("just An can access all the orders");
  }
}

export function addAgent() {
  let rc = rootCas.create();
  rc.addFile(path.resolve(__dirname, "../../src/config/chain.pem"));
  const agent = new https.Agent({
    ca: rc,
  });
  return agent;
}
