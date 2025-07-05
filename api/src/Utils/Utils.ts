/**
 * Generic class with helpful general-usage functions
 */
export class Utils {
  /**
   * Creates Promise resolve after `ms`. Usefule fot sync sleeping
   */
  static sleep(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), ms);
    });
  }
}
