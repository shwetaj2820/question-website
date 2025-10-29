import React, { useState, useEffect } from "react";
import { MathJaxContext, MathJax } from "better-react-mathjax";
import "./App.css";

const mathjaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
  },
};

function convertLatexTables(html) {
  return html.replace(/\\begin{array}\{[^}]*\}([\s\S]*?)\\end{array}/g, (match, inner) => {
    inner = inner
      .replace(/\\textbf\{([^}]*)\}/g, "<b>$1</b>")
      .replace(/\\text\{([^}]*)\}/g, "$1")
      .replace(/&nbsp;/g, " ")
      .replace(/\\\\/g, "\n")
      .replace(/\\hline/g, "");
    const rows = inner
      .trim()
      .split("\n")
      .filter((r) => r.trim() !== "")
      .map((row) => {
        const cells = row
          .split("&")
          .map((cell) => `<td>${cell.trim()}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    return `<table class="latex-table">${rows}</table>`;
  });
}

function App() {
  const [questions, setQuestions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [current, setCurrent] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [titleInput, setTitleInput] = useState("");

  // timer states
  const [minutes, setMinutes] = useState(10);
  const [seconds, setSeconds] = useState(0);
  const [target, setTarget] = useState(5);
  const [solved, setSolved] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    console.log("📦 Fetching /data/questions.json...");
    fetch("/data/questions.json")
      .then((res) => res.json())
      .then((data) => {
        const fixed = data.map((q) => {
          let html = q.questionHtml || "";
          html = html.replace(/src="\/upfiles/g, 'src="https://gateoverflow.in/upfiles');
          html = convertLatexTables(html);
          const title = q.title && q.title.trim() !== "" ? q.title : "Untitled Question";
          return { ...q, title, questionHtml: html };
        });
        setQuestions(fixed);
        setFiltered(fixed);
        setCurrent(fixed[Math.floor(Math.random() * fixed.length)]);
        console.log(`✅ Data loaded: ${fixed.length} questions`);
      })
      .catch((err) => console.error("❌ Failed to load JSON:", err));
  }, []);

  const applyFilter = () => {
  const tags = tagInput
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t !== "");

  const titleQuery = titleInput.trim().toLowerCase();

  const filteredQuestions = questions.filter((q) => {
    const matchTitle =
      titleQuery === "" || q.title.toLowerCase().includes(titleQuery);

    const qTags = (q.tags || []).map((t) => t.toLowerCase());

    const matchTags =
      tags.length === 0 ||
      tags.some((inputTag) =>
        qTags.some((qt) => qt.includes(inputTag))
      );

    return matchTitle && matchTags;
  });

  setFiltered(filteredQuestions);

  if (filteredQuestions.length > 0) {
    setCurrent(filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)]);
  } else {
    setCurrent(null);
  }
};


  const nextQuestion = () => {
    if (filtered.length === 0 || !isRunning) return;
    const random = filtered[Math.floor(Math.random() * filtered.length)];
    setCurrent(random);
    setSolved((prev) => prev + 1);
  };

  // timer logic
  useEffect(() => {
    let timer;
    if (isRunning && (minutes > 0 || seconds > 0)) {
      timer = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(timer);
            setIsRunning(false);
          } else {
            setMinutes((m) => m - 1);
            setSeconds(59);
          }
        } else {
          setSeconds((s) => s - 1);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, minutes, seconds]);

  const startSession = () => {
    setSolved(0);
    setIsRunning(true);
  };

  const resetSession = () => {
    setIsRunning(false);
    setSolved(0);
  };

  useEffect(() => {
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise();
    }
  }, [current]);

  const sessionComplete = !isRunning && (minutes === 0 && seconds === 0 || solved >= target);

  return (
    <MathJaxContext version={3} config={mathjaxConfig}>
      <div
        style={{
          background: "#222",
          color: "#eee",
          minHeight: "100vh",
          padding: "2rem",
          fontFamily: "sans-serif",
        }}
      >
        {/* TIMER + TARGET SECTION */}
        <div
          style={{
            background: "#2b2b2b",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h3>Session Settings</h3>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              disabled={isRunning}
              style={{ width: "80px", padding: "0.4rem" }}
            />
            <label>Minutes</label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              disabled={isRunning}
              style={{ width: "80px", padding: "0.4rem" }}
            />
            <label>Target Questions</label>
            <button
              onClick={startSession}
              disabled={isRunning}
              style={{ padding: "0.6rem 1rem", background: "#444", color: "#fff", borderRadius: "5px" }}
            >
              Start
            </button>
            <button
              onClick={resetSession}
              style={{ padding: "0.6rem 1rem", background: "#555", color: "#fff", borderRadius: "5px" }}
            >
              Reset
            </button>
          </div>

          <div style={{ fontSize: "1.2rem", marginTop: "0.5rem" }}>
            ⏱ Time Left: {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")} | ✅ Solved: {solved}/{target}
          </div>
        </div>

        {/* FILTER SECTION */}
        <div
          style={{
            background: "#2b2b2b",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "2rem",
          }}
        >
          <h3 style={{ marginBottom: "1rem" }}>Filter Questions</h3>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
            Filter by Title:
          </label>
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Enter part of title..."
            style={{
              width: "100%",
              padding: "0.6rem",
              borderRadius: "5px",
              border: "1px solid #555",
              background: "#111",
              color: "#fff",
              marginBottom: "1rem",
            }}
          />
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
            Filter by a Tag:
          </label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="e.g. statistics"
            style={{
              width: "100%",
              padding: "0.6rem",
              borderRadius: "5px",
              border: "1px solid #555",
              background: "#111",
              color: "#fff",
              marginBottom: "1rem",
            }}
          />
          <button
            onClick={applyFilter}
            style={{
              padding: "0.6rem 1rem",
              background: "#444",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Apply Filter
          </button>
        </div>

        {/* QUESTION SECTION */}
        {sessionComplete ? (
          <div style={{ color: "#0f0", fontSize: "1.5rem", textAlign: "center" }}>
            🎉 Session Complete! You solved {solved}/{target} questions.
          </div>
        ) : current ? (
          <>
            <h2>{current.title}</h2>
            <MathJax dynamic>
              <div
                dangerouslySetInnerHTML={{ __html: current.questionHtml }}
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  background: "#2b2b2b",
                  borderRadius: "8px",
                  textAlign: "left",
                }}
              />
            </MathJax>
            <div style={{ marginTop: "1rem" }}>
              <strong>Tags:</strong> {current.tags.join(", ")}
            </div>
            <a
              href={current.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#66f", display: "block", marginTop: "0.5rem" }}
            >
              View on GateOverflow ↗
            </a>
            <button
              onClick={nextQuestion}
              disabled={!isRunning}
              style={{
                marginTop: "2rem",
                padding: "0.6rem 1rem",
                background: isRunning ? "#444" : "#555",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: isRunning ? "pointer" : "not-allowed",
              }}
            >
              Next Random Question
            </button>
            <p style={{ marginTop: "1rem", color: "#999" }}>
              {filtered.length} questions found
            </p>
          </>
        ) : (
          <p style={{ color: "#ccc" }}>No questions found for the given filters.</p>
        )}
      </div>
    </MathJaxContext>
  );
}

export default App;
