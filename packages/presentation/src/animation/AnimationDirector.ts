import type { AnimationCue, AnimationDriver, AnimationPlayback } from "./contracts";

export type AnimationDirectorOptions = Readonly<{
  initialRevision?: number;
  maximumQueuedCues?: number;
}>;

export class AnimationDirector {
  private readonly maximumQueuedCues: number;
  private revision: number;
  private queue: AnimationCue[] = [];
  private active: Readonly<{ cue: AnimationCue; playback: AnimationPlayback }> | undefined;

  constructor(options: AnimationDirectorOptions = {}) {
    this.revision = options.initialRevision ?? 0;
    this.maximumQueuedCues = options.maximumQueuedCues ?? 64;
    if (!Number.isSafeInteger(this.maximumQueuedCues) || this.maximumQueuedCues < 1) {
      throw new Error("maximumQueuedCues must be a positive safe integer");
    }
  }

  reconcile(
    canonicalRevision: number,
    cues: readonly AnimationCue[],
    reducedMotion: boolean,
    driver: AnimationDriver,
  ): void {
    const adjacent = canonicalRevision === this.revision + 1;
    this.revision = canonicalRevision;
    if (reducedMotion || !adjacent || cues.some((cue) => cue.revision !== canonicalRevision)) {
      this.settleToCanonical(driver);
      return;
    }
    if (this.queue.length + cues.length + (this.active ? 1 : 0) > this.maximumQueuedCues) {
      this.settleToCanonical(driver);
      return;
    }
    this.queue.push(...cues);
    this.play(driver);
  }

  play(driver: AnimationDriver): void {
    if (this.active || this.queue.length === 0) return;
    const cue = this.queue.shift();
    if (!cue) return;
    let settledSynchronously = false;
    const playback = driver.play(cue, () => {
      if (!this.active) {
        settledSynchronously = true;
        return;
      }
      if (this.active?.cue.id !== cue.id) return;
      this.active = undefined;
      this.play(driver);
    });
    if (settledSynchronously) {
      this.play(driver);
    } else {
      this.active = { cue, playback };
    }
  }

  skip(driver: AnimationDriver): void {
    if (this.active) {
      this.active.playback.cancel();
      this.active = undefined;
    }
    driver.settleToCanonical();
    this.play(driver);
  }

  cancel(driver: AnimationDriver): void {
    if (this.active) this.active.playback.cancel();
    this.active = undefined;
    this.queue = [];
    driver.settleToCanonical();
  }

  settleToCanonical(driver: AnimationDriver): void {
    this.cancel(driver);
  }

  snapshot(): Readonly<{
    activeCueId?: string;
    queuedCueIds: readonly string[];
    revision: number;
  }> {
    return {
      ...(this.active ? { activeCueId: this.active.cue.id } : {}),
      queuedCueIds: this.queue.map(({ id }) => id),
      revision: this.revision,
    };
  }
}
