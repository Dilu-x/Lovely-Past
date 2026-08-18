import chalk from "chalk";

function timestamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export const logger = {
  info: (...args) => console.log(chalk.blue(`[INFO]`), chalk.gray(timestamp()), ...args),
  success: (...args) => console.log(chalk.green(`[OK]`), chalk.gray(timestamp()), ...args),
  warn: (...args) => console.log(chalk.yellow(`[WARN]`), chalk.gray(timestamp()), ...args),
  error: (...args) => console.error(chalk.red(`[ERROR]`), chalk.gray(timestamp()), ...args),
};

export default logger;