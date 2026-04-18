/**
 * Demo: set DEEPSEEK_API_KEY (and optionally XHS_MODEL) then run `npm run demo`.
 */
import "dotenv/config";
import { xhsAgent } from "./xhs/xhsAgent.js";

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("Missing DEEPSEEK_API_KEY in environment or .env");
    process.exit(1);
  }
  const prompt =
    process.argv.slice(2).join(" ").trim() ||
    "生成一条小红书职场英语图文素材：场景是跨团队催进度，用 Slack 对话模板。";

  const result = await xhsAgent.invoke(prompt, {
    configurable: { thread_id: `demo-${Date.now()}` },
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
