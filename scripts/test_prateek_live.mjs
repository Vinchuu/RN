import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';

async function checkLive(channelId) {
  try {
    const { stdout } = await execFileAsync(curlBin, [
      '-sL',
      '--compressed',
      '--max-time',
      '8',
      '-H',
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      `https://www.youtube.com/channel/${channelId}/live`
    ], { maxBuffer: 15 * 1024 * 1024 });

    const canonical = (stdout.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
    const isWatch = canonical.includes('/watch?v=');
    const isLive = stdout.includes('"isLive":true') || stdout.includes('"isLiveBroadcast":true');
    const titleMatch = (stdout.match(/<meta name="title" content="([^"]+)"/) || stdout.match(/"title":"([^"]+)"/))?.[1] || '';
    const vidMatch = (canonical.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/) || stdout.match(/"videoId":"([a-zA-Z0-9_-]{11})"/))?.[1] || '';
    
    console.log({ canonical, isWatch, isLive, titleMatch, vidMatch });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkLive('UC_qwc3gxud_vmh9UFMWKywQ');
