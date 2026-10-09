// 유튜브 오디오 재생 — 공식 IFrame Player API, 화면 밖에 숨긴 플레이어 1개를 퀴즈·목록이 공유한다
// 영상·썸네일·제목은 화면에 절대 보이지 않는다 (정답 유출 방지). display:none 은 재생이 멈출 수 있어 쓰지 않는다

const ERRORS = {
  2: '영상 주소가 올바르지 않습니다',
  5: '이 브라우저에서 재생할 수 없는 영상입니다',
  100: '영상이 삭제되었거나 비공개입니다',
  101: '유튜브가 이 영상의 재생을 막았습니다. 재생 버튼으로 다시 시도해 보세요',
  150: '유튜브가 이 영상의 재생을 막았습니다. 재생 버튼으로 다시 시도해 보세요'
};

let yt = null;          // YT.Player
let ready = false;
let song = null;        // 지금 준비된 곡
let ytState = -1;       // YT.PlayerState
let error = '';
const listeners = new Set();

function emit() {
  const s = state();
  listeners.forEach((fn) => fn(s));
}

export function state() {
  return { song, ready, error, playing: ytState === 1, buffering: ytState === 3 };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function init(hostId) {
  window.onYouTubeIframeAPIReady = () => {
    yt = new window.YT.Player(hostId, {
      width: 200,
      height: 200,
      playerVars: {
        controls: 0, disablekb: 1, playsinline: 1, rel: 0, fs: 0, iv_load_policy: 3,
        origin: location.origin
      },
      events: {
        onReady: () => {
          ready = true;
          const frame = yt.getIframe();
          frame.tabIndex = -1;
          frame.title = '숨겨진 오디오 플레이어';
          if (song) cue(song);
          emit();
        },
        onStateChange: (e) => { ytState = e.data; emit(); },
        onError: (e) => { error = ERRORS[e.data] || '재생 중 오류가 났습니다'; ytState = -1; emit(); }
      }
    });
  };
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.onerror = () => { error = '유튜브에 연결하지 못했습니다'; emit(); };
  document.head.append(tag);
}

function cue(s) {
  ytState = -1;
  yt.cueVideoById({ videoId: s.vid, startSeconds: s.start });
}

// 곡 준비 (재생은 하지 않음). 같은 곡이면 그대로 둔다
export function load(s) {
  if (song && s && song.id === s.id && !error) return;
  song = s;
  error = '';
  if (ready && s && s.vid) cue(s);
  else ytState = -1;
  emit();
}

// 클릭 핸들러 안에서 동기적으로 불러야 iOS 에서도 소리가 난다
export function toggle() {
  if (!ready || !song || !song.vid) return;
  if (error) { // 오류 뒤 다시 누르면 처음부터 재시도
    error = '';
    yt.loadVideoById({ videoId: song.vid, startSeconds: song.start });
    emit();
    return;
  }
  if (ytState === 1 || ytState === 3) yt.pauseVideo();
  else yt.playVideo();
}

export function pause() {
  if (ready && (ytState === 1 || ytState === 3)) yt.pauseVideo();
}

export function seek(sec) {
  if (!ready || !song || error) return;
  yt.seekTo(Math.max(0, sec), true);
}

export function restart() {
  if (!ready || !song || error) return;
  yt.seekTo(song.start, true);
  yt.playVideo();
}

export function time() {
  if (!ready || !song || !song.vid) return { current: 0, duration: 0 };
  return { current: yt.getCurrentTime() || 0, duration: yt.getDuration() || 0 };
}
