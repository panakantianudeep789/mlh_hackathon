import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Sidebar } from '../components/Sidebar';
import { TestLabPage } from '../pages/TestLabPage';
import { BenchmarkPage } from '../pages/BenchmarkPage';
import { PatchReviewPage } from '../pages/PatchReviewPage';
import { SettingsPage } from '../pages/SettingsPage';
import { DashboardPage } from '../pages/DashboardPage';

// Mock API layer
vi.mock('../services/api', () => ({
  api: {
    getHealth: vi.fn().mockResolvedValue({
      status: 'healthy',
      version: '1.0.0',
      timestamp: '2026-10-28T08:00:00Z',
      ollama_connected: false,
      docker_available: false,
      active_repos: 1,
    }),
    getModelStatus: vi.fn().mockResolvedValue({
      running: false,
      base_url: 'http://localhost:11434',
      model: 'qwen2.5-coder:7b',
      available_models: [],
      setup_instructions: 'Run ollama serve and pull model',
    }),
    listRepositories: vi.fn().mockResolvedValue([
      {
        id: 'DEMO-BUGGY-PROJECT',
        name: 'Buggy Python Project (Demo)',
        path: '/data/repos/DEMO-BUGGY-PROJECT',
        file_count: 5,
        languages: { '.py': 5 },
        status: 'ready',
        created_at: '2026-10-28T08:00:00Z',
      },
    ]),
    getRecentBugs: vi.fn().mockResolvedValue([]),
    getRecentTestRuns: vi.fn().mockResolvedValue([]),
    getBenchmarkResults: vi.fn().mockResolvedValue({
      run_id: 'BENCH-MOCK',
      total_cases: 10,
      completed: 10,
      passed: 7,
      failed: 3,
      skipped: 0,
      duration_ms: 2500,
      results: [
        {
          case_id: 'CASE-01',
          title: 'Division by Zero on Empty Numbers List',
          relevant_file: 'app/calculator.py',
          retrieval_success: true,
          location_success: true,
          diagnosis_correctness: true,
          regression_reproduced: true,
          patch_applied: true,
          patch_verified: true,
          existing_tests_passing: true,
          model_availability: 'offline',
          execution_environment: 'docker_container',
          duration_ms: 120,
          status: 'passed',
        },
      ],
    }),
    getFileContent: vi.fn().mockResolvedValue({
      path: 'app/calculator.py',
      content: 'def average(numbers):\n    return sum(numbers) / len(numbers)\n',
      lines_count: 2,
      extension: '.py',
      is_secret: false,
      is_parsed: true,
      symbols: [{ name: 'average', type: 'function', start_line: 1, end_line: 2 }],
    }),
    validatePatch: vi.fn().mockResolvedValue({
      is_valid: true,
      file_path: 'app/calculator.py',
      source_hash: 'a1b2c3d4e5f6',
      stale_patch: false,
      errors: [],
      warnings: [],
      additions: 2,
      deletions: 1,
      unified_diff: '--- a/app/calculator.py\n+++ b/app/calculator.py\n@@ -1,2 +1,3 @@\n',
    }),
    getSettings: vi.fn().mockResolvedValue({
      ollama_base_url: 'http://localhost:11434',
      ollama_model: 'qwen2.5-coder:7b',
      max_upload_mb: 50,
      test_timeout_seconds: 30,
      allow_host_execution: false,
      docker_image: 'python:3.11-slim',
      default_ignore_patterns: ['.git', 'node_modules'],
      secret_patterns: ['.env'],
      docker_available: false,
    }),
    getBenchmarkExportUrl: vi.fn((format) => `http://localhost:8000/api/benchmark/results/export?format=${format}`),
  },
}));

describe('Frontend Verification Test Suite', () => {
  it('renders Sidebar with all main navigation items', () => {
    const onSelectPage = vi.fn();
    render(
      <Sidebar
        activePage="overview"
        onSelectPage={onSelectPage}
        modelStatus={{ running: false, model: 'qwen2.5-coder:7b' } as any}
        dockerAvailable={false}
      />
    );

    expect(screen.getByText('RepoPilot')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Bug Detective')).toBeInTheDocument();
    expect(screen.getByText('Test Lab')).toBeInTheDocument();
    expect(screen.getByText('Evaluation')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Test Lab'));
    expect(onSelectPage).toHaveBeenCalledWith('tests');
  });

  it('renders Dashboard with repository statistics', () => {
    render(
      <DashboardPage
        repositories={[
          {
            id: 'DEMO-BUGGY-PROJECT',
            name: 'Buggy Python Project (Demo)',
            path: '/data/repos/DEMO-BUGGY-PROJECT',
            file_count: 5,
            languages: { '.py': 5 },
            status: 'ready',
            created_at: '2026-10-28T08:00:00Z',
          },
        ]}
        selectedRepoId="DEMO-BUGGY-PROJECT"
        modelStatus={null}
        dockerAvailable={false}
        onNavigate={vi.fn()}
        onLoadDemo={vi.fn()}
        isLoadingDemo={false}
        recentBugs={[]}
        recentTests={[]}
      />
    );

    expect(screen.getByText('Buggy Python Project (Demo)')).toBeInTheDocument();
  });

  it('renders Test Lab with safe default blocking when Docker is unavailable', () => {
    render(
      <TestLabPage
        repositoryId="DEMO-BUGGY-PROJECT"
        dockerAvailable={false}
        onNavigateToPatch={vi.fn()}
      />
    );

    expect(screen.getByText('Environment Unavailable (Docker Missing)')).toBeInTheDocument();
    expect(screen.getByText('Execution Blocked (Opt-In Required)')).toBeInTheDocument();

    const checkbox = screen.getByLabelText(/Allow Restricted Host Execution/i);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText('Run Test')).toBeInTheDocument();
  });

  it('renders 14-Step Benchmark page with independent metrics columns', async () => {
    render(<BenchmarkPage repositoryId="DEMO-BUGGY-PROJECT" />);

    expect(screen.getByText(/14-Step Reproducible Evaluation Benchmark/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Division by Zero on Empty Numbers List')).toBeInTheDocument();
      expect(screen.getByText('CASE-01')).toBeInTheDocument();
      expect(screen.getByText('REPRODUCED')).toBeInTheDocument();
      expect(screen.getByText('VERIFIED')).toBeInTheDocument();
    });
  });

  it('renders Patch Review with SHA-256 hash and rollback controls', async () => {
    render(
      <PatchReviewPage
        repositoryId="DEMO-BUGGY-PROJECT"
        filePath="app/calculator.py"
        onNavigateToTest={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/SHA-256: a1b2c3d4e5/i)).toBeInTheDocument();
      expect(screen.getByText('Patch Validated')).toBeInTheDocument();
      expect(screen.getByText('Rollback File')).toBeInTheDocument();
      expect(screen.getByText('Apply to Working Copy')).toBeInTheDocument();
    });
  });

  it('renders Settings Page with input fields and protected secret patterns', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://localhost:11434')).toBeInTheDocument();
      expect(screen.getByDisplayValue('qwen2.5-coder:7b')).toBeInTheDocument();
      expect(screen.getByText(/Execution Limits & Ingestion Thresholds/i)).toBeInTheDocument();
      expect(screen.getByText(/Protected Secret Patterns/i)).toBeInTheDocument();
    });
  });
});
