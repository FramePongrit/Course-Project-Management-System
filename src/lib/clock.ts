export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  private currentTime: Date;

  constructor(time: Date | string | number) {
    this.currentTime = new Date(time);
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  setTime(time: Date | string | number): void {
    this.currentTime = new Date(time);
  }

  advanceBy(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }
}

