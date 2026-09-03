import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Prism from "prismjs";

import "prismjs/themes/prism-tomorrow.css";
import "./GeminiChat.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://ai-media-studio-api.xto1971.workers.dev";

export default function GeminiChat() {
  const [input, setInput] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    Prism.highlightAll();
  }, [chatLog, streamingText]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chatLog, streamingText]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.readAsDataURL(file);

      reader.onload = () => {
        const result = reader.result;

        if (typeof result !== "string") {
          reject(new Error("Failed to read image."));
          return;
        }

        resolve(result.split(",")[1]);
      };

      reader.onerror = () => {
        reject(
          new Error("Failed to read image file.")
        );
      };
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB.");
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearChat = () => {
    if (loading) return;

    setChatLog([]);
    setStreamingText("");
    setInput("");

    removeImage();
  };

  const extractGeminiText = (data) => {
    try {
      const candidates = data?.candidates;

      if (!Array.isArray(candidates)) {
        return "";
      }

      let text = "";

      for (const candidate of candidates) {
        const parts =
          candidate?.content?.parts;

        if (!Array.isArray(parts)) {
          continue;
        }

        for (const part of parts) {
          if (
            part &&
            typeof part.text === "string"
          ) {
            text += part.text;
          }
        }
      }

      return text;
    } catch (error) {
      console.warn(
        "Could not extract Gemini text:",
        error
      );

      return "";
    }
  };

  const processSSELine = (
    line,
    onText,
    onError
  ) => {
    const trimmed = line.trim();

    if (!trimmed) return;

    if (!trimmed.startsWith("data:")) {
      return;
    }

    const jsonString = trimmed
      .replace(/^data:\s*/, "")
      .trim();

    if (!jsonString || jsonString === "[DONE]") {
      return;
    }

    try {
      const data = JSON.parse(jsonString);

      if (data?.error) {
        onError(
          new Error(
            data.error.message ||
              data.error.status ||
              "Gemini API error"
          )
        );

        return;
      }

      const text = extractGeminiText(data);

      if (text) {
        onText(text);
      }
    } catch (error) {
      console.warn(
        "SSE JSON parse warning:",
        error
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      (!input.trim() && !imageFile) ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setStreamingText("");

    const currentInput = input.trim();
    const currentImageFile = imageFile;
    const currentImagePreview = imagePreview;

    setInput("");
    setImageFile(null);
    setImagePreview("");

    const userMessage = {
      role: "user",
      parts: currentInput
        ? [currentInput]
        : [],
      previewUrl: currentImagePreview,
    };

    setChatLog((prev) => [
      ...prev,
      userMessage,
    ]);

    try {
      // ------------------------------------------------------
      // Convert image to base64
      // ------------------------------------------------------

      let imageData = null;

      if (currentImageFile) {
        const base64 =
          await convertToBase64(
            currentImageFile
          );

        imageData = {
          base64,
          mimeType: currentImageFile.type,
        };
      }

      // ------------------------------------------------------
      // Prepare previous conversation history
      // ------------------------------------------------------

      const cleanedHistory =
        chatLog.map((msg) => ({
          role:
            msg.role === "model"
              ? "model"
              : "user",

          parts: Array.isArray(msg.parts)
            ? msg.parts
                .map((part) =>
                  typeof part === "string"
                    ? part
                    : part?.text || ""
                )
                .filter(Boolean)
            : [],
        }));

      // ------------------------------------------------------
      // Send request to Cloudflare Worker
      // ------------------------------------------------------

      const response = await fetch(
        `${API_URL}/api/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message: currentInput,
            history: cleanedHistory,
            image: imageData,
          }),
        }
      );

      // ------------------------------------------------------
      // Handle HTTP errors
      // ------------------------------------------------------

      if (!response.ok) {
        let errorMessage =
          `Request failed with status ${response.status}`;

        try {
          const errorData =
            await response.json();

          if (errorData?.error) {
            errorMessage =
              errorData.error;

            if (errorData?.details) {
              console.error(
                "Gemini API details:",
                errorData.details
              );
            }
          }
        } catch {
          const errorText =
            await response.text();

          if (errorText) {
            errorMessage = errorText;
          }
        }

        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error(
          "The server did not return a streaming response."
        );
      }

      // ------------------------------------------------------
      // Read Gemini SSE stream
      // ------------------------------------------------------

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder("utf-8");

      let buffer = "";
      let completeModelResponse = "";

      const handleIncomingText = (text) => {
        completeModelResponse += text;

        setStreamingText(
          completeModelResponse
        );
      };

      const handleStreamError = (error) => {
        throw error;
      };

      while (true) {
        const { value, done } =
          await reader.read();

        if (done) break;

        buffer += decoder.decode(
          value,
          {
            stream: true,
          }
        );

        // SSE events are separated by blank lines.
        const events =
          buffer.split(/\r?\n\r?\n/);

        // Keep the incomplete event for
        // the next network chunk.
        buffer =
          events.pop() || "";

        for (const event of events) {
          const lines =
            event.split(/\r?\n/);

          for (const line of lines) {
            processSSELine(
              line,
              handleIncomingText,
              handleStreamError
            );
          }
        }
      }

      // Flush remaining decoder data.
      buffer += decoder.decode();

      if (buffer.trim()) {
        const lines =
          buffer.split(/\r?\n/);

        for (const line of lines) {
          processSSELine(
            line,
            handleIncomingText,
            handleStreamError
          );
        }
      }

      // ------------------------------------------------------
      // Add completed response to chat
      // ------------------------------------------------------

      if (!completeModelResponse) {
        completeModelResponse =
          "I couldn't generate a response.";
      }

      setChatLog((prev) => [
        ...prev,
        {
          role: "model",
          parts: [
            completeModelResponse,
          ],
        },
      ]);

      setStreamingText("");
    } catch (error) {
      console.error(
        "CHAT ERROR:",
        error
      );

      setStreamingText("");

      setChatLog((prev) => [
        ...prev,
        {
          role: "model",
          parts: [
            `**Connection Error**\n\n${
              error?.message ||
              "Unable to connect to the AI service."
            }`,
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      handleSubmit(e);
    }
  };

  return (
    <div className="gemini-chat">

      {/* HEADER */}
      <div className="gemini-header">
        <div className="gemini-title-row">
          <div className="gemini-icon">
            ✦
          </div>

          <div>
            <h2>AI Chat</h2>

            <p>
              Chat with your AI assistant and
              analyze images.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="clear-chat-button"
          onClick={handleClearChat}
          disabled={loading}
        >
          Clear
        </button>
      </div>


      {/* MESSAGES */}
      <div className="gemini-messages">

        {chatLog.length === 0 &&
          !streamingText && (
            <div className="chat-empty">

              <div className="empty-icon">
                ✦
              </div>

              <h3>
                How can I help you?
              </h3>

              <p>
                Ask questions, generate ideas,
                explain code, or upload an image
                for analysis.
              </p>

              <div className="suggestion-grid">

                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      "Explain this concept in simple terms."
                    )
                  }
                >
                  Explain something
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      "Help me write a professional business plan."
                    )
                  }
                >
                  Write something
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      "Help me debug this code."
                    )
                  }
                >
                  Debug code
                </button>

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  Analyze an image
                </button>

              </div>
            </div>
          )}


        {chatLog.map(
          (message, index) => (
            <div
              className={`chat-message ${
                message.role === "user"
                  ? "user-message"
                  : "model-message"
              }`}
              key={index}
            >

              <div className="message-avatar">
                {message.role === "user"
                  ? "You"
                  : "✦"}
              </div>

              <div className="message-content">

                {message.previewUrl && (
                  <img
                    src={
                      message.previewUrl
                    }
                    alt="Uploaded"
                    className="chat-image"
                  />
                )}

                {message.parts.map(
                  (part, partIndex) => (
                    <div
                      key={partIndex}
                      className="markdown-content"
                    >
                      <ReactMarkdown
                        remarkPlugins={[
                          remarkGfm,
                        ]}
                      >
                        {typeof part ===
                        "string"
                          ? part
                          : part?.text || ""}
                      </ReactMarkdown>
                    </div>
                  )
                )}

              </div>
            </div>
          )
        )}


        {/* STREAMING RESPONSE */}
        {streamingText && (
          <div className="chat-message model-message">

            <div className="message-avatar">
              ✦
            </div>

            <div className="message-content">

              <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[
                    remarkGfm,
                  ]}
                >
                  {streamingText}
                </ReactMarkdown>
              </div>

              <span className="streaming-cursor">
                ▋
              </span>

            </div>
          </div>
        )}


        {/* THINKING */}
        {loading &&
          !streamingText && (
            <div className="chat-message model-message">

              <div className="message-avatar">
                ✦
              </div>

              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>

            </div>
          )}

        <div ref={messagesEndRef} />

      </div>


      {/* IMAGE PREVIEW */}
      {imagePreview && (
        <div className="selected-image">

          <img
            src={imagePreview}
            alt="Selected"
          />

          <button
            type="button"
            onClick={removeImage}
            title="Remove image"
          >
            ×
          </button>

        </div>
      )}


      {/* INPUT */}
      <form
        className="gemini-input-area"
        onSubmit={handleSubmit}
      >

        <div className="input-tools">

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            hidden
          />

          <button
            type="button"
            className="input-tool-button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={loading}
            title="Upload image"
          >
            ＋
          </button>

        </div>

        <textarea
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Message your AI assistant..."
          rows={1}
          disabled={loading}
        />

        <button
          type="submit"
          className="send-button"
          disabled={
            loading ||
            (!input.trim() &&
              !imageFile)
          }
          title="Send message"
        >
          {loading ? "…" : "↑"}
        </button>

      </form>


      <div className="gemini-disclaimer">
        AI can make mistakes. Check important
        information.
      </div>

    </div>
  );
}