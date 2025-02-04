import { DownloadController } from "../Controllers/DownloadController.ts";
import type { Routable } from "./Router.ts";

export const routableControllers: Routable[] = [new DownloadController()];
