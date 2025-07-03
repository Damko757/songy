import mongoose, { Mongoose } from "mongoose";
import chalk from "chalk";
import { ENV } from "../env";

let instances = 0; // Currently runnning instances

/**
 * Connects to docker mongoDB instance
 * @param options Connection options
 * @param quiet If should print "connection successfull" message
 * @returns Promise resolved with current number of instances
 */
export const connectMongoose = async (
  options: { quiet?: boolean } = {
    quiet: true,
  }
) => {
  return new Promise<number>((resolve, rejected) => {
    // Mongo Running, no need to connect

    // const connectString = `mongodb://${ENV.MONGODB_DATABASE_USER}:${ENV.MONGODB_DATABASE_PASSWORD}@${ENV.MONGODB_DATABASE_URI}:${ENV.MONGODB_DATABASE_PORT}`;
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

        resolve(++instances);
      })
      .catch((err) => {
        console.error("Unable to connect to MongoDB!");
        rejected(err);
      });
  });
};

/**
 * Disconnects from Mongoose. Keeps tracks of instances, so it is destroyed only if all instances ended
 * @return Number of left instances
 */
export const destroyMongoose = async () => {
  if (instances == 0)
    throw new Error("No running instance, synchronization problem maybe?");
  if (--instances == 0) {
    // No active client, disconnecting for real
    await mongoose.disconnect();
  }

  return instances;
};
