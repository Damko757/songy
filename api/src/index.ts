import chalk from "chalk";
import { initApp } from "./app.ts";
import { connectMongoose, destroyMongoose } from "./Database/MongoDB.ts";
import { ENV } from "./env.ts";
import { MediaFileModel } from "./Database/Schemas/MediaFile.ts";
import { APISocketServer } from "./WebSocket/APISocketServer.ts";
import { DownloaderCommandType } from "../../downloader/src/Commands/Command.ts";

console.log(chalk.blueBright(`Welcome! ${new Date()}`));

const socketServer = new APISocketServer(
  ENV.NUMBER_OF_WORKERS ? Number(ENV.NUMBER_OF_WORKERS) : 3
);

Promise.all([
  connectMongoose({ quiet: false }),
  initApp(),
  socketServer.bindWSS(),
])
  .then(([mongooseInstances, app, wssBindSuccess]) => {
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
