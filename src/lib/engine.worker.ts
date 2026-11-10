/** Renders the rev off the main thread and hands the samples back without copying them. */
import { renderRev } from './engine';

onmessage = (event: MessageEvent<number>) => {
  const channels = renderRev(event.data);
  postMessage(channels, { transfer: channels.map((channel) => channel.buffer) });
};
