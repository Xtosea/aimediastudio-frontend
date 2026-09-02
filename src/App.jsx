import { useEffect, useState } from "react";
import "./App.css";

const API_BASE =
  "https://ai-media-studio-api.xto1971.workers.dev";

function App() {
  const [text, setText] = useState(
    "Hello! Welcome to AI Media Studio. This is our first AI generated voice."
  );

  const [voices, setVoices] = useState([]);
  const [voiceId, setVoiceId] = useState("");

  const [audioUrl, setAudioUrl] = useState("");
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadVoices();

    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  async function loadVoices() {
    try {
      setLoadingVoices(true);
      setError("");

      const response = await fetch(`${API_BASE}/api/voices`);

      if (!response.ok) {
        throw new Error("Could not load voices");
      }

      const data = await response.json();

      const availableVoices = data.voices || [];

      setVoices(availableVoices);

      if (availableVoices.length > 0) {
        setVoiceId(availableVoices[0].voice_id);
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to the AI voice service.");
    } finally {
      setLoadingVoices(false);
    }
  }

  async function generateSpeech() {
    if (!text.trim()) {
      setError("Please enter some text first.");
      return;
    }

    if (!voiceId) {
      setError("Please select a voice.");
      return;
    }

    try {
      setGenerating(true);
      setError("");

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl("");
      }

      const response = await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          voiceId,
        }),
      });

      if (!response.ok) {
        let message = "Speech generation failed.";

        try {
          const data = await response.json();

          if (data.details) {
            message = data.details;
          } else if (data.error) {
            message = data.error;
          }
        } catch {
          // Ignore JSON parsing errors
        }

        throw new Error(message);
      }

      const audioBlob = await response.blob();

      if (!audioBlob.size) {
        throw new Error("The server returned an empty audio file.");
      }

      const url = URL.createObjectURL(audioBlob);

      setAudioUrl(url);
    } catch (err) {
      console.error("TTS ERROR:", err);
      setError(err.message || "Failed to generate speech.");
    } finally {
      setGenerating(false);
    }
  }

  const selectedVoice = voices.find(
    (voice) => voice.voice_id === voiceId
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">✦</div>

          <div>
            <h1>AI Media Studio</h1>
            <span>AI-powered creative tools</span>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="welcome">
          <span className="eyebrow">CREATE WITH AI</span>

          <h2>
            Bring your ideas
            <br />
            <span>to life.</span>
          </h2>

          <p>
            Create natural speech, turn images into videos,
            and make characters speak with AI.
          </p>
        </section>

        <div className="tools">
          <button className="tool active">
            <span className="tool-icon">🎙️</span>
            <span>
              <strong>Text to Speech</strong>
              <small>Generate realistic AI voices</small>
            </span>
          </button>

          <button className="tool">
            <span className="tool-icon">🖼️</span>
            <span>
              <strong>Image to Video</strong>
              <small>Animate your images with AI</small>
            </span>
            <span className="coming">Coming soon</span>
          </button>

          <button className="tool">
            <span className="tool-icon">👄</span>
            <span>
              <strong>Lip Sync</strong>
              <small>Make characters speak</small>
            </span>
            <span className="coming">Coming soon</span>
          </button>
        </div>

        <section className="studio-card">
          <div className="section-heading">
            <div>
              <span className="section-label">VOICE GENERATOR</span>
              <h3>Text to Speech</h3>
            </div>

            <span className="status">
              <span className="status-dot"></span>
              ElevenLabs
            </span>
          </div>

          <label htmlFor="text">Your text</label>

          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type something you want your AI voice to say..."
            rows={7}
            maxLength={5000}
          />

          <div className="character-count">
            {text.length} / 5000 characters
          </div>

          <label htmlFor="voice">Voice</label>

          <select
            id="voice"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            disabled={loadingVoices || generating}
          >
            {loadingVoices && (
              <option>Loading voices...</option>
            )}

            {!loadingVoices &&
              voices.map((voice) => (
                <option
                  key={voice.voice_id}
                  value={voice.voice_id}
                >
                  {voice.name}
                </option>
              ))}
          </select>

          {selectedVoice && (
            <div className="voice-info">
              <div className="voice-avatar">👨</div>

              <div>
                <strong>{selectedVoice.name}</strong>

                <span>
                  {selectedVoice.labels?.descriptive ||
                    "AI voice"}
                  {" • "}
                  {selectedVoice.labels?.accent ||
                    "standard"}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="error">
              ⚠️ {error}
            </div>
          )}

          <button
            className="generate"
            onClick={generateSpeech}
            disabled={generating || loadingVoices}
          >
            {generating ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              <>🎙️ Generate Speech</>
            )}
          </button>

          {audioUrl && (
            <div className="audio-result">
              <div className="result-heading">
                <div>
                  <span className="section-label">
                    GENERATED AUDIO
                  </span>

                  <h4>Your speech is ready</h4>
                </div>

                <span className="ready">✓ Ready</span>
              </div>

              <audio
                className="audio-player"
                controls
                src={audioUrl}
              >
                Your browser does not support audio playback.
              </audio>

              <a
                className="download"
                href={audioUrl}
                download="ai-media-studio-speech.mp3"
              >
                ⬇️ Download MP3
              </a>
            </div>
          )}
        </section>
      </main>

      <footer>
        AI Media Studio
      </footer>
    </div>
  );
}

export default App;