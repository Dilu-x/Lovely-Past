import { startFlow, handleFlowSelection } from "./paperHandler.js";

export async function noteHandlerStart(conn, jid) {
  return startFlow(conn, jid, "notes");
}

export default { noteHandlerStart, handleFlowSelection }; 
