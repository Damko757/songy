import chalk from "chalk";
import { initApp } from "./app.ts";
import { connectMongoose, destroyMongoose } from "./Database/MongoDB.ts";
import { ENV } from "./env.ts";
import { MediaFileModel } from "./Database/Schemas/MediaFile.ts";
import { APISocketServer } from "./WebSocket/APISocketServer.ts";
import { DownloaderCommandType } from "../../downloader/src/Commands/Command.ts";
import { Utils } from "./Utils/Utils.ts";

console.log(chalk.blueBright(`Welcome! ${new Date()}`));

const socketServer = new APISocketServer(
  ENV.NUMBER_OF_WORKERS ? Number(ENV.NUMBER_OF_WORKERS) : 3
);

Promise.all([
  connectMongoose({ quiet: false }),
  initApp(),
  // WebSocket connection retry
  new Promise(async (resolve, reject) => {
    let lastError: ErrorEvent;
    while (true) {
      try {
        return resolve(await socketServer.bindWSS());
      } catch (e) {
        lastError = e as ErrorEvent;
        // If unable to connect, try again after 5s
        // Else throw error
        if (
          (e as ErrorEvent).message.match(
            /^WebSocket connection to '\S*' failed: Failed to connect\.?$/
          )
        ) {
          console.log(chalk.red("Unable to connect"));
          await Utils.sleep(5_000); // Sleep for 5s
          console.log(chalk.yellow("Retrying connection..."));
          continue;
        }

        break;
      }
    }

    reject(lastError);
  }),
])
  .then(([mongooseInstances, app, wasWSSAlreadyRunning]) => {
    // Everything is running
    app
      .listen(ENV.API_PORT)
      .on("error", (e) => console.error(chalk.red(e)))
      .on("listening", () => {
        console.log(
          chalk.blue(`Running at port ${chalk.underline(ENV.API_PORT)}!`)
        );
      });
  })
  .catch((err) => {
    console.error(err);
    destroyMongoose();
  });

process.on("SIGINT", () => {
  console.log(chalk.blue("\rClosing connection"));
  socketServer.destroy();
  destroyMongoose();
  process.exit();
});
