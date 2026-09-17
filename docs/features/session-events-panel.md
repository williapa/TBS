# Session events panel

The session events panel renders the newest committed domain events first and keeps at most 100 event rows. Restored history is presented without transient feedback.

Each newly observed committed action also produces one short audio alert. Ordinary actions use a single high tone, while any action that emits a `turn-ended` event uses a distinct descending two-tone alert. This covers both explicit end-turn actions and turns that end automatically after all available actions are exhausted. Audio is optional feedback: browser audio-policy or device failures must not affect gameplay or event rendering.
