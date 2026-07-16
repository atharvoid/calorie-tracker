# Data Assistant — Technical Documentation

Data Assistant is a highly interactive, responsive Next.js application that converts unstructured trade inputs (messy text, handwritten/printed bill photos, or inconsistent Excel/CSV spreadsheets) into a clean, editable, and exportable order table with built-in financial analytics and insights.

---

## 🏗️ Architecture & Component Layout

The application is structured into three layers: **UI Elements**, **Deterministic Code Helpers (Pure Functions)**, and **API Routes (Google Gemini LLM Integration)**.

```mermaid
graph TD
    %% User Inputs
    subgraph Input ["Input Modes"]
        A[Paste Messy Text]
        B[Upload Photo / Bill]
        C[Upload Spreadsheet .xlsx/.csv]
        D[Bulletproof Demo Safety Net]
    end

    %% UI Components
    subgraph UI ["Core App Shell (DemoApp)"]
        TP[TransformPanel]
        ET[EditableTable]
        AR[AnalyticsReport]
    end

    %% Data Helpers
    subgraph Helpers ["Deterministic Business Logic (lib/)"]
        NM[normalize.ts]
        PF[parse-file.ts]
        EX[export-xlsx.ts]
        AN[analytics.ts]
        RP[report-pdf.tsx]
    end

    %% LLM APIs
    subgraph Gemini ["LLM API (api/)"]
        AE[/api/extract]
        AEI[/api/extract-image]
        AI[/api/insights]
    end

    %% Connectors
    A --> AE
    B --> AEI
    C --> PF
    D --> TP
    
    AE --> NM
    AEI --> NM
    PF --> NM
    
    NM --> ET
    ET --> EX
    
    ET -- lifted rows state --> AR
    AR --> AN
    AN --> AI
    AR --> RP
```

---

## 📁 File Structure & Purpose

### 1. `lib/` (Core Logic)
- **[types.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/types.ts)**: Core TypeScript interfaces representing raw rows, normalized rows, status options (`Paid`, `Pending`, `Partial`), and metadata objects.
- **[ai.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/ai.ts)**: Model definitions exposing the Google Gemini 3.5 Flash (`gemini-3.5-flash`) models for text, vision, and insights.
- **[extraction.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/extraction.ts)**: Shared Zod extraction schema and system instructions defining how unstructured data should be interpreted.
- **[normalize.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/normalize.ts)**: Computes calculated values (e.g., amount = quantity × rate), formats currency (INR), formats dates, and flags rows needing verification.
- **[parse-file.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/parse-file.ts)**: Client-side CSV/XLSX parser using SheetJS. Implements heuristic column-matching for standard business headers.
- **[export-xlsx.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/export-xlsx.ts)**: Re-exports rows to a clean `.xlsx` spreadsheet with numeric columns and a summaries footer.
- **[analytics.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/analytics.ts)**: Computes deterministic KPIs (total sales, collections, outstanding, trends, status distribution) in pure TypeScript.
- **[image.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/image.ts)**: Client-side canvas utility to downscale large phone photographs to max 1600px JPEGs before uploading.

### 2. `components/` (Interface Elements)
- **[demo-app.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/demo-app.tsx)**: Main application context holding global table rows and active tab state. Mounts sub-views with `hidden` to keep analytics and insights cached.
- **[transform-panel.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/transform-panel.tsx)**: Coordinates input text-areas, dropzones, example selector chips, and triggers transformation pipelines.
- **[editable-table.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/editable-table.tsx)**: Renders the structured rows, registers inline cell editing, handles status changes, and contains export links.
- **[editable-cell.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/editable-cell.tsx)**: Click-to-edit input helper supporting text, numeric, and date cell types.
- **[analytics-report.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/analytics-report.tsx)**: Renders financial KPIs, requests descriptive insights, and lays out Recharts.
- **[charts.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/charts.tsx)**: Formatted Top Customers BarChart and Sales Trend AreaChart.
- **[report-pdf.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/report-pdf.tsx)**: Client-side vector PDF generation using `@react-pdf/renderer` displaying KPIs, insights, and customer lists.

### 3. `app/api/` (Next.js Edge/Server Routes)
- **[api/extract/route.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/app/api/extract/route.ts)**: Accepts text input, calls Gemini, and normalizes structured rows.
- **[api/extract-image/route.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/app/api/extract-image/route.ts)**: Single-stage endpoint sending base64 images directly to Gemini for visual JSON extraction.
- **[api/insights/route.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/app/api/insights/route.ts)**: Converts computed business analytics numbers into 4-6 concise bullet points.

---

## 🔄 Data Pipeline

```
Unstructured Data (Text / Image) 
  ➔ Google Gemini Extraction 
  ➔ Deterministic Normalization (lib/normalize.ts) 
  ➔ Editable State (demo-app.tsx) 
  ➔ Live Inline Edits (recomputeRow)
  ➔ Metric Computations (lib/analytics.ts)
  ➔ Narrative Generation (api/insights) ➔ Recharts / PDF Report
```

1. **Extraction**: Google Gemini processes text or base64 image data and matches it against `extractionSchema`.
2. **Deterministic Processing**: The backend applies a standard normalizer `normalizeRows` which:
   - Sets calculated `amount` if `quantity` and `rate` exist.
   - Clears flags and verifies row validity dynamically.
   - Restructures dates to ISO `YYYY-MM-DD`.
3. **Editing & Live Recalculation**: Clicking any cell in `<EditableTable />` calls `recomputeRow(editedRow)`. The totals and outstanding metrics update instantly.
4. **Narrative Analysis**: When navigating to the **Analytics** tab, the pre-computed metrics object is posted to `/api/insights`. The LLM translates numbers into plain English/Hindi business points.

---

## ⚡ Setup & Local Running

### Prerequisites
- Node.js 18+
- pnpm (Recommended)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```bash
# Get your API key from https://aistudio.google.com/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

### 3. Start Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🚀 Deploys
This project is configured to auto-build on **Vercel**. When importing:
1. Vercel automatically detects the Next.js setup.
2. Ensure you add `GOOGLE_GENERATIVE_AI_API_KEY` under the project environment variables before building.
3. The build config executes `next build` which compiles code into static pages and API serverless functions.
