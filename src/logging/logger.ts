export class Log {
  public static info(message: string) {
    console.log(`%c${message}`, 'color: blue');
  }

  public static warn(message: string) {
    console.log(`%c${message}`, 'color: yellow');
  }

  public static error(message: string) {
    console.log(`%c${message}`, 'color: red');
  }
}

export default Log;
