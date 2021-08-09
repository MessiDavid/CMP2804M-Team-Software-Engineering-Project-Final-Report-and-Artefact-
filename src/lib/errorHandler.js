export default class ServerError extends Error {
  constructor(message, status = 400, data, error) {
    super();
    this.message = message;
    this.status = status;
    this.data = data;
    this.error = error;
  }
}
