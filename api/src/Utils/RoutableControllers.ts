import { DownloadController } from "../Controllers/DownloadController.ts";
import { MetadataController } from "../Controllers/MetadataController.ts";
import type { Routable } from "./Router.ts";

export const routableControllers: Routable[] = [
  new DownloadController(),
  new MetadataController(),
];
