import type { Routable, RoutingMap } from "../Utils/Router";

export abstract class Controller {}

export abstract class RoutableController
  extends Controller
  implements Routable
{
  abstract routes(): RoutingMap;
}
