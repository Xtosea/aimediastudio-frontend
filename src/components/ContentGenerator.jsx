import { useState } from "react";

const API_BASE =
  "https://ai-media-studio-api.xto1971.workers.dev";

const CONTENT_TYPES = [
  "Social Media Post",
  "Facebook Post",
  "Instagram Caption",
  "TikTok Caption",
  "YouTube Description",
  "Advertisement",
  "Blog Introduction",
  "Product Description",
  "Video Script",
];

const PLATFORMS = [
  "General",
  "Facebook",
  "Instagram",
  "TikTok",
  "YouTube",
  "LinkedIn",
  "X",
];

const TONES = [
  "Professional",
  "Friendly",
  "Funny",
  "Inspirational",
  "Persuasive",
  "Casual",
];

const LENGTHS = [
  "Short",
  "Medium",
  "Long",
];

function ContentGenerator() {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] =
    useState("Social Media Post");
  const [platform, setPlatform] =
    useState("General");
  const [tone, setTone] =
    useState("Professional");
  const [length, setLength] =
    useState("Medium");

  const [generating, setGenerating] =
    useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function generateContent() {
    if (!topic.trim()) {
      setError("Please enter a topic or idea.");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setResult(null);

      const response = await fetch(
        `${API_BASE}/api/content/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: topic.trim(),
            contentType,
            platform,
            tone,
            length,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Content generation failed."
        );
      }

      if (!data.content) {
        throw new Error(
          "The content generator returned an empty result."
        );
      }

      setResult(data.content);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while generating content."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setError("");
      alert(`${label} copied to clipboard.`);
    } catch {
      setError(
        "Unable to copy automatically. Please select and copy the text."
      );
    }
  }

  function copyEverything() {
    if (!result) return;

    const hashtags = Array.isArray(result.hashtags)
      ? result.hashtags
          .map((tag) =>
            tag.startsWith("#") ? tag : `#${tag}`
          )
          .join(" ")
      : "";

    const fullText = [
      result.headline,
      "",
      result.content,
      "",
      result.callToAction,
      "",
      hashtags,
    ]
      .filter(Boolean)
      .join("\n");

    copyText(fullText, "Full content");
  }

  function regenerate() {
    generateContent();
  }

  function useForTTS() {
    if (!result?.content) return;

    const text = result.content;

    window.dispatchEvent(
      new CustomEvent("ai-media-use-text", {
        detail: { text },
      })
    );

    alert(
      "Content prepared for Text to Speech. TTS integration can be connected next."
    );
  }

  return (
    <div className="tool-page">
      <div className="tool-heading">
        <div className="heading-icon">✍️</div>

        <div>
          <h2>AI Content Generator</h2>

          <p>
            Create engaging social media content,
            scripts, advertisements, and more with AI.
          </p>
        </div>
      </div>

      <div className="workspace-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Content Settings</h3>

              <p>
                Tell the AI what you want to create.
              </p>
            </div>
          </div>

          <label className="field-label">
            Topic or Idea
          </label>

          <textarea
            className="textarea prompt-textarea"
            value={topic}
            onChange={(e) =>
              setTopic(e.target.value)
            }
            placeholder="Example: A new AI Media Studio helping African creators make videos, voiceovers and social media content."
          />

          <div className="character-count">
            {topic.length} characters
          </div>

          <label className="field-label text-label">
            Content Type
          </label>

          <select
            className="select"
            value={contentType}
            onChange={(e) =>
              setContentType(e.target.value)
            }
          >
            {CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <label className="field-label text-label">
            Platform
          </label>

          <select
            className="select"
            value={platform}
            onChange={(e) =>
              setPlatform(e.target.value)
            }
          >
            {PLATFORMS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="field-label text-label">
            Tone
          </label>

          <select
            className="select"
            value={tone}
            onChange={(e) =>
              setTone(e.target.value)
            }
          >
            {TONES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="field-label text-label">
            Length
          </label>

          <select
            className="select"
            value={length}
            onChange={(e) =>
              setLength(e.target.value)
            }
          >
            {LENGTHS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            onClick={generateContent}
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
                Generate Content
              </>
            )}
          </button>
        </section>

        <section className="panel result-panel">
          <div className="panel-header">
            <div>
              <h3>Generated Content</h3>

              <p>
                Your AI-generated content will appear
                here.
              </p>
            </div>
          </div>

          {result ? (
            <div className="content-result">
              <div className="content-result-card">
                <div className="result-label">
                  HEADLINE
                </div>

                <h2 className="generated-headline">
                  {result.headline}
                </h2>

                <button
                  className="copy-button"
                  onClick={() =>
                    copyText(
                      result.headline,
                      "Headline"
                    )
                  }
                >
                  📋 Copy
                </button>
              </div>

              <div className="content-result-card">
                <div className="result-label">
                  CONTENT
                </div>

                <div className="generated-content">
                  {result.content}
                </div>

                <button
                  className="copy-button"
                  onClick={() =>
                    copyText(
                      result.content,
                      "Content"
                    )
                  }
                >
                  📋 Copy Content
                </button>
              </div>

              <div className="content-result-card">
                <div className="result-label">
                  CALL TO ACTION
                </div>

                <div className="generated-cta">
                  {result.callToAction}
                </div>

                <button
                  className="copy-button"
                  onClick={() =>
                    copyText(
                      result.callToAction,
                      "Call to action"
                    )
                  }
                >
                  📋 Copy CTA
                </button>
              </div>

              <div className="content-result-card">
                <div className="result-label">
                  HASHTAGS
                </div>

                <div className="hashtags">
                  {Array.isArray(
                    result.hashtags
                  ) &&
                    result.hashtags.map(
                      (tag, index) => (
                        <span
                          className="hashtag"
                          key={`${tag}-${index}`}
                        >
                          #
                          {String(tag).replace(
                            /^#/,
                            ""
                          )}
                        </span>
                      )
                    )}
                </div>

                <button
                  className="copy-button"
                  onClick={() => {
                    const tags =
                      Array.isArray(
                        result.hashtags
                      )
                        ? result.hashtags
                            .map(
                              (tag) =>
                                `#${String(
                                  tag
                                ).replace(
                                  /^#/,
                                  ""
                                )}`
                            )
                            .join(" ")
                        : "";

                    copyText(
                      tags,
                      "Hashtags"
                    );
                  }}
                >
                  📋 Copy Hashtags
                </button>
              </div>

              <div className="result-actions">
                <button
                  className="secondary-button"
                  onClick={copyEverything}
                >
                  📋 Copy Everything
                </button>

                <button
                  className="secondary-button"
                  onClick={regenerate}
                  disabled={generating}
                >
                  🔄 Regenerate
                </button>

                <button
                  className="secondary-button"
                  onClick={useForTTS}
                >
                  🔊 Use for TTS
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-result">
              <div className="empty-icon">
                ✍️
              </div>

              <h3>No content yet</h3>

              <p>
                Enter a topic, choose your settings,
                and generate your content.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ContentGenerator;