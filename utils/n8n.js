
import axios from "axios";

export const sendToN8N = async (data) => {
  try {
    const url = process.env.N8N_WEBHOOK_URL || "http://127.0.0.1:5678/webhook/task-assigned";
    await axios.post(url, data);
  } catch (err) {
    console.error("⚠️ n8n not reachable, skipping notification");
  }
};
