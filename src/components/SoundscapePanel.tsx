import React from 'react';
import {
  SOUNDSCAPE_TRACKS,
  type SoundscapeId,
  type SoundscapeTrack,
} from '../types/soundscape';
import type { UseSoundscapeReturn } from '../hooks/useSoundscape';

interface SoundscapePanelProps {
  soundscapeState: UseSoundscapeReturn;
}

export const SoundscapePanel: React.FC<SoundscapePanelProps> = ({ soundscapeState }) => {
  const {
    activeSoundId,
    isPlaying,
    isMuted,
    masterVolume,
    volumes,
    error,
    isAutoplayBlocked,
    playSound,
    pauseSound,
    resumeSound,
    stopAll,
    setMasterVolume,
    setTrackVolume,
    toggleMute,
    clearError,
  } = soundscapeState;

  const activeTrack = SOUNDSCAPE_TRACKS.find((t) => t.id === activeSoundId) || null;

  const renderTrackIcon = (id: SoundscapeId) => {
    switch (id) {
      case 'rain':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
            <line x1="8" y1="19" x2="8" y2="21" />
            <line x1="8" y1="13" x2="8" y2="15" />
            <line x1="16" y1="19" x2="16" y2="21" />
            <line x1="16" y1="13" x2="16" y2="15" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="12" y1="15" x2="12" y2="17" />
          </svg>
        );
      case 'forest':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2L6 9h3l-4 7h6l-2 5h6l-2-5h6l-4-7h3L12 2z" />
          </svg>
        );
      case 'cafe':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
        );
      case 'whiteNoise':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M2 12h2l3-6 4 12 3-8 3 4 3-2h4" />
          </svg>
        );
    }
  };

  return (
    <div className="soundscape-page" data-testid="soundscape-panel">
      {/* Header section */}
      <section className="soundscape-header-card">
        <div className="soundscape-header-titles">
          <span className="soundscape-tag-badge">Ambient Audio</span>
          <h2 className="soundscape-title">Focus Soundscape</h2>
          <p className="soundscape-subtitle">
            Procedural, browser-native background soundscapes designed to calm your environment and deepen concentration.
          </p>
        </div>

        {/* Autoplay / Error Banner */}
        {(isAutoplayBlocked || error) && (
          <div className="soundscape-alert-banner" data-testid="soundscape-error-banner" role="alert">
            <div className="alert-banner-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="alert-banner-text">
              {error || 'Browser audio policy requires user interaction before playing sound.'}
            </div>
            <button
              type="button"
              className="alert-banner-dismiss"
              onClick={clearError}
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        {/* Now Playing Bar */}
        <div className="soundscape-status-bar" data-testid="soundscape-now-playing-bar">
          <div className="status-bar-left">
            {isPlaying && activeTrack ? (
              <div className="now-playing-info">
                <div className="soundwave-bars" aria-hidden="true">
                  <span className="wave-bar bar-1" />
                  <span className="wave-bar bar-2" />
                  <span className="wave-bar bar-3" />
                  <span className="wave-bar bar-4" />
                </div>
                <span className="now-playing-text" data-testid="soundscape-active-label">
                  Now playing: <strong>{activeTrack.name}</strong>
                  {isMuted && <span className="muted-badge">Muted</span>}
                </span>
              </div>
            ) : activeTrack ? (
              <div className="now-playing-info is-paused">
                <span className="paused-dot" aria-hidden="true" />
                <span className="now-playing-text" data-testid="soundscape-active-label">
                  Paused: <strong>{activeTrack.name}</strong>
                </span>
              </div>
            ) : (
              <span className="idle-sound-text" data-testid="soundscape-active-label">
                No ambient sound playing. Select a soundscape below to begin.
              </span>
            )}
          </div>

          <div className="status-bar-actions">
            {isPlaying ? (
              <button
                type="button"
                className="btn btn-secondary btn-status-action"
                onClick={pauseSound}
                data-testid="soundscape-quick-pause"
              >
                Pause
              </button>
            ) : (
              activeTrack && (
                <button
                  type="button"
                  className="btn btn-primary btn-status-action"
                  onClick={() => resumeSound()}
                  data-testid="soundscape-quick-resume"
                >
                  Resume
                </button>
              )
            )}

            <button
              type="button"
              className="btn btn-secondary btn-status-action btn-stop-all"
              onClick={stopAll}
              disabled={!isPlaying && !activeSoundId}
              data-testid="soundscape-stop-all-btn"
              title="Stop and release all ambient sound"
            >
              Stop All
            </button>
          </div>
        </div>

        {/* Master Volume & Mute Controls */}
        <div className="soundscape-master-controls" data-testid="soundscape-master-controls">
          <div className="master-vol-group">
            <button
              type="button"
              className={`btn-mute-toggle ${isMuted ? 'is-muted' : ''}`}
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute soundscape' : 'Mute soundscape'}
              title={isMuted ? 'Unmute soundscape' : 'Mute soundscape'}
              data-testid="soundscape-mute-btn"
            >
              {isMuted ? (
                // Muted speaker icon
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                // Active speaker icon
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            <div className="slider-wrapper">
              <label htmlFor="soundscape-master-vol" className="slider-label">
                Master Volume <span>{Math.round(masterVolume * 100)}%</span>
              </label>
              <input
                id="soundscape-master-vol"
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(masterVolume * 100)}
                onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
                aria-label="Master volume slider"
                aria-valuenow={Math.round(masterVolume * 100)}
                className="soundscape-slider"
                data-testid="soundscape-master-volume-slider"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4 Soundscape Cards Grid */}
      <section className="soundscape-cards-grid" aria-label="Available ambient soundscapes">
        {SOUNDSCAPE_TRACKS.map((track: SoundscapeTrack) => {
          const isThisPlaying = isPlaying && activeSoundId === track.id;
          const isThisPaused = !isPlaying && activeSoundId === track.id;
          const trackVol = volumes[track.id] ?? 0.7;

          return (
            <div
              key={track.id}
              className={`soundscape-card ${isThisPlaying ? 'is-playing' : ''} ${
                isThisPaused ? 'is-paused' : ''
              }`}
              data-testid={`soundscape-card-${track.id}`}
            >
              <div className="card-top-row">
                <div className="track-icon-wrapper" aria-hidden="true">
                  {renderTrackIcon(track.id)}
                </div>

                <div className="card-badges">
                  {isThisPlaying && (
                    <span
                      className="track-status-pill playing"
                      data-testid={`soundscape-status-${track.id}`}
                    >
                      <span className="dot-pulse" aria-hidden="true" /> Playing
                    </span>
                  )}
                  {isThisPaused && (
                    <span
                      className="track-status-pill paused"
                      data-testid={`soundscape-status-${track.id}`}
                    >
                      Paused
                    </span>
                  )}
                  {!isThisPlaying && !isThisPaused && (
                    <span
                      className="track-status-pill ready"
                      data-testid={`soundscape-status-${track.id}`}
                    >
                      {track.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="card-body">
                <h3 className="track-name">{track.name}</h3>
                <p className="track-desc">{track.description}</p>
              </div>

              <div className="card-controls">
                {/* Play / Pause Toggle Button */}
                {isThisPlaying ? (
                  <button
                    type="button"
                    className="btn btn-secondary soundscape-play-btn"
                    onClick={pauseSound}
                    aria-label={`Pause ${track.name}`}
                    data-testid={`soundscape-btn-pause-${track.id}`}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary soundscape-play-btn"
                    onClick={() => playSound(track.id)}
                    aria-label={`Play ${track.name}`}
                    data-testid={`soundscape-btn-play-${track.id}`}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>{isThisPaused ? 'Resume' : 'Play'}</span>
                  </button>
                )}

                {/* Independent Volume Slider */}
                <div
                  className="track-vol-slider-group"
                  data-testid={`soundscape-volume-wrapper-${track.id}`}
                >
                  <label htmlFor={`vol-slider-${track.id}`} className="track-vol-label">
                    Volume: <span>{Math.round(trackVol * 100)}%</span>
                  </label>
                  <input
                    id={`vol-slider-${track.id}`}
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(trackVol * 100)}
                    onChange={(e) => setTrackVolume(track.id, Number(e.target.value) / 100)}
                    aria-label={`${track.name} volume slider`}
                    aria-valuenow={Math.round(trackVol * 100)}
                    className="soundscape-slider track-slider"
                    data-testid={`soundscape-volume-${track.id}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Footer Info / Accessibility notice */}
      <footer className="soundscape-footer-note">
        <p>
          Generated in real-time in your browser with the Web Audio API. Audio never plays automatically on page reload and respects your device volume settings.
        </p>
      </footer>
    </div>
  );
};
