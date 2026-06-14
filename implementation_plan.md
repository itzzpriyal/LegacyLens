# 5 Frontend Enhancements Implementation Plan

This plan details the implementation of the 5 requested enhancements to the LegacyLens frontend (and minor backend tweaks to fully support the LLM changes).

## User Review Required
Please review the proposed approach for the Multi-Provider LLM API Key support. Since the backend currently hardcodes the OpenAI SDK, I will update the backend to dynamically set the `base_url` depending on the provider you select, allowing the existing OpenAI SDK to call Groq, Meta, Mistral, etc. without needing new Python packages.

## Open Questions
- For the live upload progress, the backend `POST /upload` endpoint currently processes the zip and runs extraction synchronously before returning, while the actual analysis runs in the background. Is it acceptable if the frontend simulates the initial "Uploading..." and "Extracting..." phases using a timer to give immediate visual feedback while it waits for the HTTP response? 

## Proposed Changes

---

### Dependency Graph (Click-to-Highlight)

#### [MODIFY] `frontend/src/components/DependencyGraph/DependencyGraph.tsx`
- Add a new React state: `const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);`
- When a node is selected, visually fade out (`opacity: 0.2`) all nodes and edges that are not directly connected (source or target) to the selected node.
- Expand the existing Inspect Panel to include two lists:
  - **Depends on:** Files this file imports (Outgoing edges).
  - **Depended on by:** Files that import this file (Incoming edges).
- Allow clicking the background (`onPaneClick`) or clicking the same node again to reset `selectedNodeId` to `null`.

---

### Settings - Multi-Provider LLM Support

#### [MODIFY] `frontend/src/pages/SettingsPage.tsx`
- Add a dropdown to select the active provider (OpenAI, Anthropic, Google Gemini, Groq, Mistral, Cohere).
- Manage multiple localStorage keys: `legacylens_api_key_openai`, `legacylens_api_key_anthropic`, etc.
- When the provider is switched, the API key input will dynamically populate with the saved key for that specific provider.
- Update the global API client to pass both the `api_key` and the `llm_provider` to the backend.

#### [MODIFY] `frontend/src/api/client.ts`
- Update `generateRecommendations` and `generateNarrative` to accept `provider?: string` and send it in the request body.

#### [MODIFY] `backend/app/schemas.py`
- Add `provider: str = "openai"` to `AIRecommendationRequest`.

#### [MODIFY] `backend/app/services/ai_service.py` & `backend/app/routers/ai.py`
- Modify `_make_client` to accept a `provider` argument.
- Route requests to the appropriate `base_url` for providers that are OpenAI-compatible (like Groq or Mistral). Note: for Anthropic/Gemini, if standard OpenAI compatibility is not available, we may either use a proxy (like LiteLLM) or limit to OpenAI-compatible endpoints for now. I will use the `openai` Python package's custom `base_url` feature to support Groq/Mistral/Together easily.

---

### Reposition Zoom Controls

#### [MODIFY] `frontend/src/components/DependencyGraph/DependencyGraph.tsx`
- Update the `<Controls />` component from ReactFlow: `<Controls position="top-right" />`.

#### [MODIFY] `frontend/src/components/Roadmap/RoadmapView.tsx`
- Update the `<Controls />` component to `<Controls position="top-right" />`.

---

### Upload Progress Live Status

#### [MODIFY] `frontend/src/pages/LandingPage.tsx`
- Replace the generic spinner with a `div` panel showing sequential logs.
- Implement a `useEffect` timer that advances through fake/estimated status messages ("Uploading file...", "Extracting archive...", "Reading project structure...", "Parsing dependencies...") while `isLoading` is true, stopping at "Waiting for backend response...".
- Once the backend responds, immediately show "Done. Redirecting to dashboard...".

---

### Technical Debt Section 

#### [MODIFY] `frontend/src/components/DebtDashboard/DebtDashboard.tsx`
- Add a professional summary definition of Technical Debt near the top Debt Score card.
- Include the measurement formula: `Technical Debt Ratio (TDR) = (Remediation Cost / Development Cost) × 100%`.

## Verification Plan
- **Manual Verification:** 
  1. Upload a dummy zip file to observe the new live progress logs.
  2. Visit the Settings page to toggle between LLM providers and save/clear keys.
  3. Navigate to the Graph and Roadmap to verify the zoom controls are in the top right.
  4. Click on a node in the Dependency Graph to verify that non-connected nodes fade out and the side panel shows the dependencies list.
  5. Visit the Technical Debt dashboard to view the newly added definition.
