import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import { Router } from "./Utils/Router.ts";
import { routableControllers } from "./Utils/RoutableControllers.ts";
import { errorHandler, type ErrorResponse } from "./Utils/ErrorHandler.ts";
import { HttpStatusCode } from "axios";

export const initApp = () => {
  const app = express();

  app.use(helmet());
  app.use(bodyParser.json());

  const router = new Router(routableControllers);
  router.createRoutes(app);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const errorMsg: ErrorResponse = {
      message: `Unknown request: ${req.method} ${req.url}`,
    };

    res.status(HttpStatusCode.BadRequest).send(errorMsg);
  });

  app.use(errorHandler);

  return app;
};
