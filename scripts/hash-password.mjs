import { randomBytes, scryptSync } from "node:crypto";

function hiddenPrompt(label) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      reject(new Error("请在终端中运行 npm run user:hash"));
      return;
    }
    let value = "";
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onData = (buffer) => {
      for (const character of buffer.toString("utf8")) {
        if (character === "\u0003") {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdout.write("\n");
          reject(new Error("已取消"));
          return;
        }
        if (character === "\r" || character === "\n") {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        value += character;
        process.stdout.write("•");
      }
    };
    process.stdin.on("data", onData);
  });
}

try {
  const password = await hiddenPrompt("输入新账号密码（不会显示）：");
  if (password.length < 8) throw new Error("密码至少需要 8 位");
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  console.log(`\n请将下面的 passwordHash 复制到 user.json：\nscrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "生成失败");
  process.exitCode = 1;
}
