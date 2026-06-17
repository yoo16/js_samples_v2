const tracks = [
    {
        title: 'Music 1',
        artist: 'Audio Track',
        src: 'audio/music1.mp3',
    },
    {
        title: 'Music 2',
        artist: 'Audio Track',
        src: 'audio/music2.mp3',
    },
    {
        title: 'Music 3',
        artist: 'Audio Track',
        src: 'audio/music3.mp3',
    },
];

const audio = document.getElementById('audio');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const playlist = document.getElementById('playlist');
const trackCount = document.getElementById('trackCount');
const progressBar = document.getElementById('progressBar');
const currentTime = document.getElementById('currentTime');
const duration = document.getElementById('duration');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const volumeBar = document.getElementById('volumeBar');
const speedSelect = document.getElementById('speedSelect');
const visualizer = document.getElementById('visualizer');
const visualBars = document.querySelectorAll('.visual-bar');

let currentTrackIndex = 0;
let isShuffle = false;
let isRepeat = false;

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
}

function setActiveButton(button, isActive) {
    button.classList.toggle('bg-cyan-300', isActive);
    button.classList.toggle('text-slate-950', isActive);
    button.classList.toggle('bg-white/10', !isActive);
    button.classList.toggle('text-slate-200', !isActive);
}

function renderPlaylist() {
    playlist.innerHTML = '';
    trackCount.textContent = tracks.length;

    tracks.forEach((track, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = [
            'playlist-item',
            'flex',
            'w-full',
            'items-center',
            'gap-3',
            'rounded-2xl',
            'border',
            'p-3',
            'text-left',
            'transition',
        ].join(' ');
        button.dataset.trackIndex = index;
        button.innerHTML = `
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-black">${index + 1}</span>
            <span class="min-w-0">
                <span class="block truncate text-sm font-black">${track.title}</span>
                <span class="block truncate text-xs font-semibold text-slate-400">${track.artist}</span>
            </span>
        `;
        button.addEventListener('click', () => {
            loadTrack(index);
            playAudio();
        });
        playlist.appendChild(button);
    });
}

function updatePlaylistState() {
    document.querySelectorAll('.playlist-item').forEach((item) => {
        const isActive = Number(item.dataset.trackIndex) === currentTrackIndex;
        item.classList.toggle('border-cyan-300', isActive);
        item.classList.toggle('bg-cyan-300/15', isActive);
        item.classList.toggle('text-white', isActive);
        item.classList.toggle('border-white/10', !isActive);
        item.classList.toggle('bg-white/[0.04]', !isActive);
        item.classList.toggle('text-slate-200', !isActive);
        item.classList.toggle('hover:bg-white/[0.08]', !isActive);
    });
}

function loadTrack(index) {
    currentTrackIndex = index;
    const track = tracks[currentTrackIndex];

    audio.src = track.src;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    progressBar.value = 0;
    currentTime.textContent = '0:00';
    duration.textContent = '0:00';
    updatePlaylistState();
}

function playAudio() {
    audio.play();
}

function pauseAudio() {
    audio.pause();
}

function togglePlayback() {
    if (audio.paused) {
        playAudio();
    } else {
        pauseAudio();
    }
}

function getNextIndex() {
    if (!isShuffle) return (currentTrackIndex + 1) % tracks.length;

    if (tracks.length === 1) return currentTrackIndex;

    let nextIndex = currentTrackIndex;
    while (nextIndex === currentTrackIndex) {
        nextIndex = Math.floor(Math.random() * tracks.length);
    }
    return nextIndex;
}

function nextTrack() {
    loadTrack(getNextIndex());
    playAudio();
}

function prevTrack() {
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    loadTrack(prevIndex);
    playAudio();
}

function updateProgress() {
    progressBar.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    currentTime.textContent = formatTime(audio.currentTime);
}

function seekAudio() {
    if (!audio.duration) return;

    audio.currentTime = (Number(progressBar.value) / 100) * audio.duration;
}

function updateVisualizer() {
    visualizer.classList.toggle('opacity-60', audio.paused);
    visualBars.forEach((bar, index) => {
        const height = audio.paused ? 18 + (index % 5) * 9 : 18 + Math.random() * 100;
        bar.style.height = `${height}px`;
    });
}

playBtn.addEventListener('click', togglePlayback);
prevBtn.addEventListener('click', prevTrack);
nextBtn.addEventListener('click', nextTrack);
progressBar.addEventListener('input', seekAudio);

volumeBar.addEventListener('input', (event) => {
    audio.volume = Number(event.target.value);
});

speedSelect.addEventListener('change', (event) => {
    audio.playbackRate = Number(event.target.value);
});

shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    setActiveButton(shuffleBtn, isShuffle);
});

repeatBtn.addEventListener('click', () => {
    isRepeat = !isRepeat;
    setActiveButton(repeatBtn, isRepeat);
});

audio.addEventListener('play', () => {
    playBtn.textContent = 'Ⅱ';
});

audio.addEventListener('pause', () => {
    playBtn.textContent = '▶';
});

audio.addEventListener('loadedmetadata', () => {
    duration.textContent = formatTime(audio.duration);
});

audio.addEventListener('timeupdate', updateProgress);

audio.addEventListener('ended', () => {
    if (isRepeat) {
        audio.currentTime = 0;
        playAudio();
        return;
    }

    nextTrack();
});

renderPlaylist();
loadTrack(currentTrackIndex);
audio.volume = Number(volumeBar.value);
audio.playbackRate = Number(speedSelect.value);
setInterval(updateVisualizer, 220);
