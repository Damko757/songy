import chalk from "chalk";
import { initApp } from "./app.ts";
import { connectMongoose, destroyMongoose } from "./Database/MongoDB.ts";
import { ENV } from "./env.ts";
import { MediaFileModel } from "./Database/Schemas/MediaFile.ts";

console.log(chalk.blueBright(`Welcome! ${new Date()}`));

Promise.all([connectMongoose({ quiet: false }), initApp()])
  .then(([mongooseInstances, app]) => {
    app
      .listen(ENV.API_PORT)
      .on("error", (e) => console.error(chalk.red(e)))
      .on("listening", () =>
        console.log(
          chalk.blue(`Running at port ${chalk.underline(ENV.API_PORT)}!`)
        )
      );
  })
  .catch((err) => {
    console.error(err);
    destroyMongoose();
  });
