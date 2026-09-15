import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';

async function checkLiveUrl(url) {
  try {
    const { stdout } = await execFileAsync(curlBin, [
      '-sL',
      '--compressed',
      '--max-time',
      '8',
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      '-H', 'Accept-Language: en-US,en;q=0.9',
      url
    ], { maxBuffer: 15 * 1024 * 1024 });

    const canonical = (stdout.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
    const isWatch = canonical.includes('/watch?v=');
    const isLive = stdout.includes('"isLive":true') || stdout.includes('"isLiveBroadcast":true') || stdout.includes('"style":"LIVE"');
    const titleMatch = (stdout.match(/<meta name="title" content="([^"]+)"/) || stdout.match(/"title":"([^"]+)"/))?.[1] || '';
    const vidMatch = (canonical.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/) || stdout.match(/"videoId":"([a-zA-Z0-9_-]{11})"/))?.[1] || '';
    const viewerMatch = (stdout.match(/"originalViewCount":"(\d+)"/) || stdout.match(/"text":"([0-9,]+)"},{"text":"\s*watching/i))?.[1] || '';

    return { url, len: stdout.length, canonical, isWatch, isLive, titleMatch, vidMatch, viewerMatch };
  } catch (err) {
    return { url, error: err.message };
  }
}

async function run() {
  // Test NASA, LofiGirl, Sky News live stream
  console.log(await checkLiveUrl('https://www.youtube.com/watch?v=21X5lGlDOfg')); // NASA
  console.log(await checkLiveUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk')); // Lofi Girl
}

run();
