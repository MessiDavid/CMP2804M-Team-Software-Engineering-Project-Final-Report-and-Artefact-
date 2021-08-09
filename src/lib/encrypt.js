import jose from "node-jose";
import fs from "fs";
import path from "path";
const { JWE, JWK, JWS } = jose;
const cert = fs.readFileSync(
  path.join(__dirname, "../config/rsa_public_key.pem")
);

const _privateKey = fs.readFileSync(
  path.join(__dirname, "../config/rsa_private_key.pem")
);

// get a key from secret
export const getKey = async (input, kty, kid) => {
  const extra = { kid: kid };
  const key = await JWK.asKey(input, kty, extra);
  const publicKey = key.toJSON();
  const privateKey = key.toJSON(true);
  const keyId = publicKey.kid;
  return key;
};

// generate an jws_token and jws_key
export const generateJws = async (option) => {
  const privateKey = await getKey(_privateKey, "pem", "0001");
  const options = {
    alg: "RS256",
    fields: { kid: "0001" },
    format: "compact",
  };

  const signer = JWS.createSign(options, privateKey);
  const payloads = JSON.stringify(option);
  const jws_token = await signer.update(payloads, "utf8").final();
  return { jws_token, privateKey };
};

// encrypt an jwe_token and jwe_key
export const generateJwe = async (jws_token) => {
  const publicKey = await getKey(cert, "pem", "0004");
  const keyId = "0004";
  const contentAlg = "A128GCM";
  const options = {
    compact: true,
    contentAlg: contentAlg,
    protect: Object.keys({
      alg: "RSA-OAEP-256",
      kid: keyId,
      enc: contentAlg,
    }),
    fields: {
      alg: "RSA-OAEP-256",
      kid: keyId,
      enc: contentAlg,
    },
  };
  const encrypter = JWE.createEncrypt(options, publicKey);
  const jwe_token = await encrypter.update(jws_token, "utf8").final();

  return { jwe_token, publicKey };
};

// decrypt jws from jwe
export const decryptJwe = async (jwe_token, privateKey) => {
  const decryptor = await JWE.createDecrypt(privateKey);
  return await decryptor.decrypt(jwe_token);
};

// decrypt data from jws
const verifyJws = async (jws_token, jws_key) => {
  return await JWS.createVerify(jws_key).verify(jws_token);
};

// encrypt data
export const encrypt = async (data) => {
  const jws = await generateJws(data);
  const jwe = await generateJwe(jws.jws_token);
  return { ...jws, ...jwe };
};

// decrypt data
export const decrypt = async ({ jwe_token, privateKey, publicKey }) => {
  const jweObject = await decryptJwe(jwe_token, privateKey);
  const jws_token = jweObject.payload.toString();

  const jwsObject = await verifyJws(jws_token, publicKey);
  const jwspayload = jwsObject.payload.toString();

  return jwspayload;
};

// test encrypt and decrypt
const test = async () => {
  // the data need to be encrypted
  const data = {
    username: "jack",
    userId: "123",
  };

  // =============== encrypt ===============
  const { jwe_token, jwe_key, jws_token, jws_key } = await encrypt(data);
  console.log("the data after encrypt jwe_token: ", jwe_token);

  // =============== decrypt ===============
  const originaldata = await decrypt({ jwe_token, jwe_key, jws_key });
  console.log("the data after decrypt: ", originaldata);
};
