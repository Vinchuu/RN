import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';

async function test(handle) {
  try {
    const { stdout } = await execFileAsync(curlBin, [
      '-sL',
      '--compressed',
      '--max-time',
      '8',
      '-H',
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      `https://www.youtube.com/@${handle.replace(/^@/, '')}`
    ], { maxBuffer: 15 * 1024 * 1024 });

    console.log(`[${handle}] length:`, stdout.length);
    const channelIdMatch = stdout.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/);
    console.log(`[${handle}] channelId:`, channelIdMatch ? channelIdMatch[1] : 'not found');

    const avatarMatch = stdout.match(/"avatar":{"thumbnails":\[{"url":"([^"]+)"/);
    console.log(`[${handle}] avatar:`, avatarMatch ? avatarMatch[1] : 'not found');

    const canonical = (stdout.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
    console.log(`[${handle}] canonical:`, canonical);

    // Look for video IDs in the channel page
    const videoMatches = [...stdout.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map(m => m[1]);
    console.log(`[${handle}] found ${videoMatches.length} videoIds, first 3:`, videoMatches.slice(0, 3));
  } catch (err) {
    console.error(`[${handle}] Error:`, err.message);
  }
}

test('PRATEEKYT');
