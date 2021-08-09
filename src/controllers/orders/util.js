import ServerError from "../../lib/errorHandler";

export const validationExpiryDate = (expiryDate) => {
  if (!expiryDate) {
    throw new ServerError("expiryDate can't not be empty");
  }
  return expiryDate < new Date().getTime();
};
