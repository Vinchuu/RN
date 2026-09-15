import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';

async function testChannel(handle) {
  const url = `https://www.youtube.com/@${handle.replace(/^@/, '')}/live`;
  console.log(`Checking ${url}...`);
  try {
    const { stdout } = await execFileAsync(curlBin, [
      '-sL',
      '--compressed',
      '--max-time',
      '8',
      '-H',
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      '-H',
      'Accept-Language: en-US,en;q=0.9',
      url
    ], { maxBuffer: 15 * 1024 * 1024 });

    console.log(`[${handle}] length: ${stdout.length}`);
    const canonical = (stdout.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
    console.log(`[${handle}] canonical: ${canonical}`);
    const isWatch = canonical.includes('/watch?v=');
    const hasLiveFlags = stdout.includes('"isLive":true') || stdout.includes('"isLiveBroadcast":true') || stdout.includes('"liveStreamability"');
    console.log(`[${handle}] isWatch: ${isWatch}, hasLiveFlags: ${hasLiveFlags}`);
    
    // Check if videoId is found
    const vidMatch = canonical.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/) || stdout.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    console.log(`[${handle}] videoId: ${vidMatch ? vidMatch[1] : 'none'}`);

    // Check title
    const titleMatch = stdout.match(/<meta name="title" content="([^"]+)"/) || stdout.match(/"title":"([^"]+)"/);
    console.log(`[${handle}] title: ${titleMatch ? titleMatch[1] : 'none'}`);

    // Check viewer count
    const viewerMatch = stdout.match(/"originalViewCount":"(\d+)"/) || stdout.match(/"text":"([0-9,]+)"},{"text":"\s*watching/i);
    console.log(`[${handle}] viewers: ${viewerMatch ? viewerMatch[1] : 'none'}`);
  } catch (err) {
    console.error(`[${handle}] Error:`, err.message);
  }
}

async function run() {
  await testChannel('LofiGirl');
  await testChannel('PRATEEKYT');
}

run();
