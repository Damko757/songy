import mongoose, { Mongoose } from "mongoose";
import chalk from "chalk";
import { ENV } from "../env";

/**
 *
 * @param options Connection options
 * @param quiet If should print "connection successfull" message
 * @returns Promise resolved with current istance
 */
export const connectMongoose = async (
  options: { quiet?: boolean } = {
    quiet: true,
  }
) => {
  return new Promise<typeof mongoose>((resolve, rejected) => {
    // Mongo Running, no need to connect

    const connectString = `mongodb://${ENV.MONGODB_DATABASE_URI}:${ENV.MONGODB_DATABASE_PORT}`;

    mongoose
      .set("strictQuery", false)
      .connect(connectString)
      .then(async (mongooseInstance) => {
        if (options.quiet === false) {
          // Logging only if not quiet
          console.info(
            chalk.green(
              `Successfully connected to ${chalk.underline(
                chalk.greenBright("MongoDB")
              )}!`
            )
          );
        }

        resolve(mongooseInstance);
      })
      .catch((err) => {
        console.error("Unable to connect to MongoDB!");
        rejected(err);
      });
  });
};
