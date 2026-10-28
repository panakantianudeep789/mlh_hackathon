# Hackathon Live Demonstration Guide

Follow this 5-minute demonstration script to present RepoPilot AI to judges and developers.

---

## 1. Overview Dashboard (30 Seconds)
- Open `http://localhost:5173`.
- Point out the **dark-first developer tool aesthetic**, clean status pills, and system metrics.
- Emphasize the core principle:
  > *"AI suggestions are hypotheses until checked against real code and test results."*
- Click **"Try Demo Repository"** (or point out that `Buggy Python Project (Demo)` is already loaded).

---

## 2. Code Explorer & Python AST (1 Minute)
- Navigate to **Code Explorer** in the sidebar.
- Show the 3-panel layout:
  - Left: File tree with search and extension classification.
  - Center: Source viewer with line numbers and breadcrumb.
  - Right: **Extracted AST symbols** (functions, classes, docstrings, exact line ranges).
- Click on `app/calculator.py` and click on `average(numbers)`.
  - Notice the center viewer highlights lines 8–18.
- Explain: *"RepoPilot AI parses real Python AST trees, so line numbers are never fabricated."*

---

## 3. Bug Detective: Flagship Investigation (1.5 Minutes)
- Navigate to **Bug Detective**.
- Click the preset button: `ZeroDivisionError in average([])`.
  - Description: *"Why does my Python application crash with ZeroDivisionError when the user submits an empty list?"*
  - Error: `ZeroDivisionError: division by zero`
  - Target: `app/calculator.py`
- Click **"Investigate Bug"**.
- Watch the 6-step progress pipeline execute:
  1. Deconstruct -> 2. Retrieve -> 3. Analyze -> 4. Validate -> 5. Formulate -> 6. Verified
- Show the resulting finding:
  - Severity: `Medium` (with automated estimate disclaimer).
  - Causal explanation and root cause.
  - **Verified Citations**: Exact file `app/calculator.py: lines 17-18`.
  - **Minimal Patch**: Unified diff preview.
  - **Generated Regression Test**: Target pytest test reproducing the failure.

---

## 4. Patch Review & Human-in-the-Loop Control (1 Minute)
- Click **"Review in Patch Lab"**.
- Point out the unified diff view (`+2 lines`, `-0 lines`).
- Explain the security guardrail:
  - *"RepoPilot AI never overwrites your codebase automatically. It applies reviewed changes strictly to an isolated working copy."*
- Click **"Apply to Working Copy"** (status turns green).

---

## 5. Test Lab Verification (1 Minute)
- Click **"Verify in Test Lab"**.
- Show the test code loaded in the editor.
- Click **"Run Test"**.
- Watch the live terminal console output:
  - Pytest runs inside the isolated sandbox.
  - Exit code: `0`.
  - Duration: `~150 ms`.
  - Badge: `✓ Test Passed: Hypothesis Verified`.

---

## 6. Evaluation Benchmark & Agent Skills (30 Seconds)
- Navigate to **Agent Skills**:
  - Show the official `skills/repository-debugger/SKILL.md` with YAML frontmatter.
  - Show that directory consistency and required metadata pass validation.
- Navigate to **Evaluation Benchmark**:
  - Click **"Run Benchmark"**.
  - Show all 10 Python scenarios evaluated with real measurements.
  - Click **"Export CSV"** to demonstrate reproducible open-source evaluation.
