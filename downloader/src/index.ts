import chalk from "chalk";
import { CommandProcessor } from "./Commands/CommandProcessor.js";
import { connectMongoose } from "./Database/MongoDB.js";

let SING_INT_COUNT = 0; // If Program is ending

const mongoose = await connectMongoose();

const commandProcessor = new CommandProcessor();
commandProcessor.bindWSS();

process.on("SIGINT", () => {
  SING_INT_COUNT++;
  if (SING_INT_COUNT == 1) {
    console.log(chalk.blue("\rClosing connection"));
    commandProcessor.destroy().then(async () => {
      await mongoose.disconnect();
      process.exit();
    });
  } else if (SING_INT_COUNT == 2) {
    console.log(
      chalk.rgb(
        255,
        128,
        0
      )("\rAlready closing connection. Press again to force...")
    );
  } else {
    console.log(chalk.redBright("\rForceful end"));
    process.exit();
  }
});
