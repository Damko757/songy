import { HttpStatusCode } from "axios";
import chalk from "chalk";
import type { NextFunction, Request, Response } from "express";

export interface ErrorResponse {
  message?: string;
  reason?: string;
  detail?: string;
  error?: Error;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(chalk.red(err));

  const errorMsg: ErrorResponse = {
    message: "Could not complete request",
    detail: err.message ?? undefined,
    error: err,
  };

  res.status(HttpStatusCode.InternalServerError).send(errorMsg);
};
