/* Entry point of the visitor-log Worker. The logic lives in visitor-log.js. */
import { handle } from "./visitor-log.js";

export default {
  fetch(request, env) {
    return handle(request, env);
  },
};
