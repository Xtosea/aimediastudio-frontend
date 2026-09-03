import { useEffect, useRef, useState } from "react";
import "./App.css";
import GeminiChat from "./components/GeminiChat";

const API_BASE =
  "https://ai-media-studio-api.xto1971.workers.dev";

function App() {
  const [activeTool, setActiveTool] = useState("tts");

  return (
    <div className="studio">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <div>
            <div className="brand-name">AI Media</div>
            <div className="brand-subtitle">Studio</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="section-label">CREATE</div>

          <button
            className={`tool-button ${
              activeTool === "tts" ? "active" : ""
            }`}
            onClick={() => setActiveTool("tts")}
          >
            <span className="tool-icon">🎙️</span>
            <span>Text to Speech</span>
          </button>

          <button
            className={`tool-button ${
              activeTool === "image-video" ? "active" : ""
            }`}
            onClick={() => setActiveTool("image-video")}
          >
            <span className="tool-icon">🖼️</span>
            <span>Image to Video</span>
          </button>

          <button
            className={`tool-button ${
              activeTool === "lip-sync" ? "active" : ""
            }`}
            onClick={() => setActiveTool("lip-sync")}
          >
            <span className="tool-icon">👄</span>
            <span>Lip Sync</span>
          </button>
        </div>

        <button
  className={`tool-button ${
    activeTool === "chat" ? "active" : ""
  }`}
  onClick={() => setActiveTool("chat")}
>
  <span className="tool-icon">✦</span>
  <span>AI Chat</span>
</button>

        <div className="sidebar-bottom">
          <div className="api-status">
            <span className="status-dot"></span>
            <div>
              <div className="status-title">API Connected</div>
              <div className="status-subtitle">
                Cloudflare Workers
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>AI Media Studio</h1>
            <p>Create AI-powered media from one workspace.</p>
          </div>

          <div className="topbar-badge">
            <span>●</span> Studio
          </div>
        </header>

        <div className="content">
          {activeTool === "tts" && <TextToSpeech />}
          {activeTool === "image-video" && <ImageToVideo />}
          {activeTool === "lip-sync" && <LipSync />}

{activeTool === "chat" && <GeminiChat />}
          
        </div>
      </main>
    </div>
  );
}


/* ============================================================
   TEXT TO SPEECH
   ============================================================ */

function TextToSpeech() {
  const [voices, setVoices] = useState([]);
  const [voiceId, setVoiceId] = useState("");
  const [text, setText] = useState("");
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadVoices();
  }, []);

  async function loadVoices() {
    try {
      setLoadingVoices(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/voices`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load voices"
        );
      }

      const voiceList =
        data.voices ||
        data ||
        [];

      setVoices(voiceList);

      if (voiceList.length > 0) {
        setVoiceId(
          voiceList[0].voice_id ||
          voiceList[0].id ||
          ""
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingVoices(false);
    }
  }

  async function generateSpeech() {
    if (!text.trim()) {
      setError("Please enter some text.");
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

      const response = await fetch(
        `${API_BASE}/api/tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: text.trim(),
            voiceId,
          }),
        }
      );

      if (!response.ok) {
        let message = "Text-to-speech failed.";

        try {
          const data = await response.json();
          message =
            data.error ||
            data.message ||
            message;
        } catch {}

        throw new Error(message);
      }

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);

      setAudioUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="tool-page">
      <div className="tool-heading">
        <div className="heading-icon">🎙️</div>

        <div>
          <h2>Text to Speech</h2>
          <p>
            Turn your text into natural AI voice audio.
          </p>
        </div>
      </div>

      <div className="workspace-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Voice Settings</h3>
              <p>Select the voice for your generation.</p>
            </div>
          </div>

          <label className="field-label">
            Voice
          </label>

          <select
            className="select"
            value={voiceId}
            onChange={(e) =>
              setVoiceId(e.target.value)
            }
            disabled={loadingVoices}
          >
            {loadingVoices ? (
              <option>
                Loading voices...
              </option>
            ) : voices.length === 0 ? (
              <option>
                No voices available
              </option>
            ) : (
              voices.map((voice) => (
                <option
                  key={
                    voice.voice_id ||
                    voice.id
                  }
                  value={
                    voice.voice_id ||
                    voice.id
                  }
                >
                  {voice.name ||
                    voice.voice_name ||
                    "Voice"}
                </option>
              ))
            )}
          </select>

          <label className="field-label text-label">
            Text
          </label>

          <textarea
            className="textarea"
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            placeholder="Type or paste the text you want to convert into speech..."
          />

          <div className="character-count">
            {text.length} characters
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            onClick={generateSpeech}
            disabled={generating}
          >
            {generating ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              <>
                <span>✦</span>
                Generate Speech
              </>
            )}
          </button>
        </section>

        <section className="panel result-panel">
          <div className="panel-header">
            <div>
              <h3>Result</h3>
              <p>Your generated audio will appear here.</p>
            </div>
          </div>

          {audioUrl ? (
            <div className="result-content">
              <div className="audio-card">
                <div className="audio-icon">
                  🔊
                </div>

                <div className="audio-info">
                  <strong>Generated Audio</strong>
                  <span>AI voice generation complete</span>
                </div>
              </div>

              <audio
                className="audio-player"
                controls
                src={audioUrl}
              />

              <a
                className="secondary-button"
                href={audioUrl}
                download="ai-media-studio-speech.mp3"
              >
                ↓ Download Audio
              </a>
            </div>
          ) : (
            <div className="empty-result">
              <div className="empty-icon">
                🎧
              </div>

              <h3>No audio yet</h3>

              <p>
                Enter your text and generate
                speech to see the result here.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


/* ============================================================
   IMAGE TO VIDEO
   ============================================================ */

function ImageToVideo() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [previewUrl]);

  function handleImage(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);

    setImage(file);
    setPreviewUrl(url);
    setVideoUrl("");
    setError("");
    setStatus("");
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];

    handleImage(file);
  }

  function handleDrop(e) {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];

    handleImage(file);
  }

  async function generateVideo() {
    if (!image) {
      setError("Please upload an image first.");
      return;
    }

    if (!prompt.trim()) {
      setError("Please describe the video you want.");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setVideoUrl("");
      setProjectId("");
      setStatus("Uploading image...");

      const formData = new FormData();

      formData.append("image", image);
      formData.append(
        "prompt",
        prompt.trim()
      );

      const response = await fetch(
        `${API_BASE}/api/magic-hour/video`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Video generation failed."
        );
      }

      const id = data.projectId;

      if (!id) {
        throw new Error(
          "Magic Hour did not return a project ID."
        );
      }

      setProjectId(id);
      setStatus("Video generation started...");

      pollStatus(id);
    } catch (err) {
      setError(err.message);
      setGenerating(false);
      setStatus("");
    }
  }

  async function pollStatus(id) {
    try {
      const response = await fetch(
        `${API_BASE}/api/magic-hour/video/${encodeURIComponent(
          id
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to check video status."
        );
      }

      const project =
        data.project || data;

      const currentStatus =
        String(
          project.status ||
            project.state ||
            ""
        ).toLowerCase();

      if (
        currentStatus.includes("complete") ||
        currentStatus.includes("completed") ||
        currentStatus === "succeeded" ||
        currentStatus === "success"
      ) {
        const downloads =
          project.downloads || [];

        let outputUrl = "";

        if (Array.isArray(downloads)) {
          const first = downloads[0];

          if (typeof first === "string") {
            outputUrl = first;
          } else if (first) {
            outputUrl =
              first.url ||
              first.download_url ||
              first.href ||
              "";
          }
        }

        if (!outputUrl) {
          outputUrl =
            project.video_url ||
            project.output_url ||
            project.url ||
            "";
        }

        if (!outputUrl) {
          throw new Error(
            "Video completed, but no download URL was returned."
          );
        }

        setVideoUrl(outputUrl);
        setStatus("Video ready!");
        setGenerating(false);
        return;
      }

      if (
        currentStatus === "failed" ||
        currentStatus === "error" ||
        currentStatus === "cancelled"
      ) {
        throw new Error(
          project.error ||
            project.message ||
            "Magic Hour video generation failed."
        );
      }

      setStatus(
        currentStatus
          ? `Generating video... (${currentStatus})`
          : "Generating video..."
      );

      pollTimerRef.current =
        setTimeout(() => {
          pollStatus(id);
        }, 7000);
    } catch (err) {
      setError(err.message);
      setGenerating(false);
      setStatus("");
    }
  }

  return (
    <div className="tool-page">
      <div className="tool-heading">
        <div className="heading-icon">🖼️</div>

        <div>
          <h2>Image to Video</h2>
          <p>
            Animate a still image with AI-powered
            motion.
          </p>
        </div>
      </div>

      <div className="workspace-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Source Image</h3>
              <p>
                Upload the image you want to animate.
              </p>
            </div>
          </div>

          <div
            className={`upload-area ${
              previewUrl ? "has-image" : ""
            }`}
            onDragOver={(e) =>
              e.preventDefault()
            }
            onDrop={handleDrop}
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            {previewUrl ? (
              <img
                className="image-preview"
                src={previewUrl}
                alt="Selected source"
              />
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">
                  ↑
                </div>

                <strong>
                  Upload an image
                </strong>

                <span>
                  Click or drag and drop
                </span>

                <small>
                  JPG, PNG, WEBP
                </small>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            hidden
          />

          <label className="field-label text-label">
            Animation Prompt
          </label>

          <textarea
            className="textarea prompt-textarea"
            value={prompt}
            onChange={(e) =>
              setPrompt(e.target.value)
            }
            placeholder="Describe how you want the image to move. Example: A cinematic camera slowly moves forward while the subject remains natural and detailed."
          />

          <div className="generation-info">
            <div>
              <span>Model</span>
              <strong>LT X-2</strong>
            </div>

            <div>
              <span>Duration</span>
              <strong>5 seconds</strong>
            </div>

            <div>
              <span>Resolution</span>
              <strong>480p</strong>
            </div>
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {status && (
            <div className="status-box">
              <span className="spinner"></span>
              {status}
            </div>
          )}

          <button
            className="primary-button"
            onClick={generateVideo}
            disabled={generating}
          >
            {generating ? (
              <>
                <span className="spinner"></span>
                Creating Video...
              </>
            ) : (
              <>
                <span>✦</span>
                Generate Video
              </>
            )}
          </button>

          {projectId && (
            <div className="project-id">
              Project: {projectId}
            </div>
          )}
        </section>

        <section className="panel result-panel">
          <div className="panel-header">
            <div>
              <h3>Video Result</h3>
              <p>
                Your generated video will appear here.
              </p>
            </div>
          </div>

          {videoUrl ? (
            <div className="video-result">
              <video
                className="video-player"
                controls
                playsInline
                src={videoUrl}
              />

              <div className="success-message">
                ✓ Video generation complete
              </div>

              <a
                className="secondary-button"
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                ↓ Open / Download Video
              </a>
            </div>
          ) : (
            <div className="empty-result">
              <div className="empty-icon">
                ▶
              </div>

              <h3>
                No video yet
              </h3>

              <p>
                Upload an image and describe the
                motion you want to create.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


/* ============================================================
   LIP SYNC
   ============================================================ */

function LipSync() {
  return (
    <div className="tool-page">
      <div className="tool-heading">
        <div className="heading-icon">👄</div>

        <div>
          <h2>Lip Sync</h2>
          <p>
            Synchronize a character or person with
            generated speech.
          </p>
        </div>
      </div>

      <div className="coming-soon-panel">
        <div className="coming-icon">
          👄
        </div>

        <div className="coming-badge">
          NEXT
        </div>

        <h2>
          Lip Sync Studio
        </h2>

   
        

        <p>
          The interface is ready. We'll connect
          Magic Hour Lip Sync next so you can upload
          a video or character image and synchronize
          it with your ElevenLabs voice.
        </p>

        <div className="coming-features">
          <div>✓ Upload video or image</div>
          <div>✓ Select generated audio</div>
          <div>✓ AI lip synchronization</div>
          <div>✓ Preview and download</div>
        </div>
      </div>
    </div>
  );
}


export default App;
