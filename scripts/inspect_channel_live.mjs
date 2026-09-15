import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';

async function inspectChannel(handle) {
  try {
    const { stdout } = await execFileAsync(curlBin, [
      '-sL',
      '--compressed',
      '--max-time',
      '8',
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      `https://www.youtube.com/@${handle.replace(/^@/, '')}`
    ], { maxBuffer: 15 * 1024 * 1024 });

    console.log(`[${handle}] checking live badges / streams...`);
    // Check if there is a LIVE badge or live video
    const isLive = stdout.includes('"style":"BADGE_STYLE_LIVE_NOW"') ||
                   stdout.includes('"iconType":"LIVE"') ||
                   stdout.includes('"label":"LIVE"') ||
                   stdout.includes('watching now');
    console.log(`[${handle}] isLive:`, isLive);

    // Check avatar
    const avatarMatch = stdout.match(/"avatar":{"thumbnails":\[{"url":"([^"]+)"/);
    console.log(`[${handle}] avatar:`, avatarMatch ? avatarMatch[1] : null);

    // Check channel title / author
    const authorMatch = stdout.match(/<meta name="title" content="([^"]+)"/) || stdout.match(/"channelMetadataRenderer":{"title":"([^"]+)"/);
    console.log(`[${handle}] author:`, authorMatch ? authorMatch[1] : null);

  } catch (e) {
    console.error(`[${handle}] error:`, e.message);
  }
}

async function run() {
  await inspectChannel('PRATEEKYT');
}

run();
