/**
 * Task 3.3: SaveButton BottomSheet Integration Tests
 * 
 * Tests integration of BottomSheet fallback with SaveButton component
 * for mobile save flow with proper error handling and fallback UI.
 * 
 * Coverage:
 * - Web Share API failure triggers BottomSheet
 * - iOS Safari fallback behavior
 * - Android Chrome fallback behavior
 * - Desktop download unaffected by mobile logic
 * - AbortError silent handling
 * - BottomSheet content and interaction
 * - State transitions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import React from 'react';
import { SaveButton } from '@/components/SaveButton';

expect.extend(matchers);

// Mock dependencies
vi.mock('@/components/BottomSheet', () => ({
  BottomSheet: ({
    open,
    onClose,
    title,
    description,
    confirmText,
  }: {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    confirmText?: string;
  }) => 
    open ? (
      <div data-testid="bottom-sheet">
        <div data-testid="bottom-sheet-title">{title}</div>
        <div data-testid="bottom-sheet-description">{description}</div>
        <button data-testid="bottom-sheet-confirm" onClick={onClose}>
          {confirmText}
        </button>
      </div>
    ) : null
}));

vi.mock('@/lib/mobile-share', () => ({
  canShareFiles: vi.fn(),
  shareFile: vi.fn(),
  getErrorType: vi.fn(),
  isMobileDevice: vi.fn(),
  isIOSSafari: vi.fn(),
  isAndroidChrome: vi.fn(),
}));

vi.mock('@/lib/download', () => ({
  fetchImageAsFile: vi.fn(),
  sanitizeFileName: vi.fn((id: string) => `${id.toLowerCase().replace(/[^a-z0-9-_]/g, '-')}-poster.png`),
  isDesktopEnvironment: vi.fn(),
  getBrowserInfo: vi.fn(),
  downloadPosterForDesktop: vi.fn(),
}));

// Import mocked modules
import {
  canShareFiles,
  shareFile,
  getErrorType,
  isMobileDevice,
  isIOSSafari,
  isAndroidChrome,
} from '@/lib/mobile-share';
import {
  fetchImageAsFile,
  isDesktopEnvironment,
  getBrowserInfo,
  downloadPosterForDesktop,
} from '@/lib/download';

describe('SaveButton - Mobile Fallback Integration (Task 3.3)', () => {
  const mockScanId = 'test-scan-id-123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(isMobileDevice).mockReturnValue(true);
    vi.mocked(isIOSSafari).mockReturnValue(false);
    vi.mocked(isAndroidChrome).mockReturnValue(false);
    vi.mocked(canShareFiles).mockReturnValue(true);
    vi.mocked(getBrowserInfo).mockReturnValue({ name: 'Chrome', version: 120, isSupported: true });
    vi.mocked(isDesktopEnvironment).mockReturnValue(false);
    vi.mocked(shareFile).mockResolvedValue(undefined);
    vi.mocked(fetchImageAsFile).mockResolvedValue(
      new File([''], 'test-poster.png', { type: 'image/png' })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  describe('BottomSheet Display on Web Share Failure', () => {
    it('should show BottomSheet when Web Share API fails with NotAllowedError', async () => {
      // Setup: Web Share fails with NotAllowedError
      vi.mocked(shareFile).mockRejectedValue(
        new DOMException('User denied share', 'NotAllowedError')
      );
      vi.mocked(getErrorType).mockReturnValue('not-allowed');

      render(<SaveButton scanId={mockScanId} />);

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for BottomSheet to appear
      await waitFor(() => {
        expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      });
    });

    it('should show BottomSheet when Web Share API fails with TypeError', async () => {
      // Setup: Web Share fails with TypeError
      vi.mocked(shareFile).mockRejectedValue(new TypeError('Failed to share'));
      vi.mocked(getErrorType).mockReturnValue('network');

      render(<SaveButton scanId={mockScanId} />);

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for BottomSheet to appear
      await waitFor(() => {
        expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      });
    });

    it('should NOT show BottomSheet when Web Share API succeeds', async () => {
      // Setup: Web Share succeeds
      vi.mocked(shareFile).mockResolvedValue(undefined);

      render(<SaveButton scanId={mockScanId} />);

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for saved state
      await waitFor(() => {
        expect(button).toHaveTextContent('Saved');
      });

      // BottomSheet should not appear
      expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
    });

    it('should NOT show BottomSheet when user cancels (AbortError)', async () => {
      // Setup: User cancels share
      vi.mocked(shareFile).mockRejectedValue(
        new DOMException('User cancelled', 'AbortError')
      );
      vi.mocked(getErrorType).mockReturnValue('abort');

      render(<SaveButton scanId={mockScanId} />);

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for state to return to idle
      await waitFor(() => {
        expect(button).toHaveTextContent('Save Poster');
        expect(button).not.toBeDisabled();
      });

      // BottomSheet should not appear
      expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
    });
  });

  describe('BottomSheet Content Verification', () => {
    it('should display correct title: "Save Poster"', async () => {
      // Setup: Trigger fallback
      vi.mocked(shareFile).mockRejectedValue(
        new DOMException('Not allowed', 'NotAllowedError')
      );
      vi.mocked(getErrorType).mockReturnValue('not-allowed');

      render(<SaveButton scanId={mockScanId} />);

      // Trigger save
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Verify BottomSheet title
      await waitFor(() => {
        const title = screen.getByTestId('bottom-sheet-title');
        expect(title).toHaveTextContent('Save Poster');
      });
    });

    it('should display correct description with long-press guidance', async () => {
      // Setup: Trigger fallback
      vi.mocked(shareFile).mockRejectedValue(
        new DOMException('Not allowed', 'NotAllowedError')
      );
      vi.mocked(getErrorType).mockReturnValue('not-allowed');

      render(<SaveButton scanId={mockScanId} />);

      // Trigger save
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Verify BottomSheet description contains long-press guidance
      await waitFor(() => {
        const description = screen.getByTestId('bottom-sheet-description');
        expect(description).toHaveTextContent(/long press/i);
        expect(description).toHaveTextContent(/save image/i);
      });
    });

    it('should display correct confirm button text: "I got it"', async () => {
      // Setup: Trigger fallback
      vi.mocked(shareFile).mockRejectedValue(
        new DOMException('Not allowed', 'NotAllowedError')
      );
      vi.mocked(getErrorType).mockReturnValue('not-allowed');

      render(<SaveButton scanId={mockScanId} />);

      // Trigger save
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Verify confirm button text
      await waitFor(() => {
        const confirmButton = screen.getByTestId('bottom-sheet-confirm');
        expect(confirmButton).toHaveTextContent('I got it');
      });
    });
  });

  describe('BottomSheet Interaction', () => {
    it('should close BottomSheet when confirm button is clicked', async () => {
      // Setup: Trigger fallback
      vi.mocked(shareFile).mockRejectedValue(
        new DOMException('Not allowed', 'NotAllowedError')
      );
      vi.mocked(getErrorType).mockReturnValue('not-allowed');

      render(<SaveButton scanId={mockScanId} />);

      // Trigger save
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for BottomSheet to appear
      await waitFor(() => {
        expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      });

      // Click confirm button
      const confirmButton = screen.getByTestId('bottom-sheet-confirm');
      fireEvent.click(confirmButton);

      // BottomSheet should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
      });
    });

    it('should allow multiple save attempts after closing BottomSheet', async () => {
      // Setup: First save triggers fallback
      vi.mocked(shareFile).mockRejectedValue(
        new DOMException('Not allowed', 'NotAllowedError')
      );
      vi.mocked(getErrorType).mockReturnValue('not-allowed');

      render(<SaveButton scanId={mockScanId} />);

      // First save attempt
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for BottomSheet
      await waitFor(() => {
        expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      });

      // Close BottomSheet
      const confirmButton = screen.getByTestId('bottom-sheet-confirm');
      fireEvent.click(confirmButton);

      // Wait for BottomSheet to close
      await waitFor(() => {
        expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
      });

      // Second save attempt
      fireEvent.click(button);

      // BottomSheet should appear again
      await waitFor(() => {
        expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      });
    });
  });

  describe('iOS Safari Fallback Behavior', () => {
    it('should show BottomSheet immediately when iOS Safari lacks Web Share file support', async () => {
      // Setup: iOS Safari without Web Share file support
      vi.mocked(isMobileDevice).mockReturnValue(true);
      vi.mocked(isIOSSafari).mockReturnValue(true);
      vi.mocked(isAndroidChrome).mockReturnValue(false);
      vi.mocked(canShareFiles).mockReturnValue(false);

      render(<SaveButton scanId={mockScanId} />);

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // BottomSheet should appear immediately (no Web Share attempt)
      await waitFor(() => {
        expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      });

      // Web Share should NOT have been attempted
      expect(shareFile).not.toHaveBeenCalled();
    });

    it('should attempt Web Share if iOS Safari has file support', async () => {
      // Setup: iOS Safari with Web Share file support
      vi.mocked(isMobileDevice).mockReturnValue(true);
      vi.mocked(isIOSSafari).mockReturnValue(true);
      vi.mocked(canShareFiles).mockReturnValue(true);
      vi.mocked(shareFile).mockResolvedValue(undefined);

      render(<SaveButton scanId={mockScanId} />);

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for success
      await waitFor(() => {
        expect(button).toHaveTextContent('Saved');
      });

      // Web Share should have been attempted
      expect(shareFile).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
    });
  });

  describe('Android Chrome Fallback Behavior', () => {
    it('should attempt Web Share first and show BottomSheet on failure', async () => {
      // Setup: Android Chrome with Web Share that fails
      vi.mocked(isMobileDevice).mockReturnValue(true);
      vi.mocked(isAndroidChrome).mockReturnValue(true);
      vi.mocked(isIOSSafari).mockReturnValue(false);
      vi.mocked(canShareFiles).mockReturnValue(true);
      vi.mocked(shareFile).mockRejectedValue(
        new DOMException('Not allowed', 'NotAllowedError')
      );
      vi.mocked(getErrorType).mockReturnValue('not-allowed');

      render(<SaveButton scanId={mockScanId} />);

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Web Share should have been attempted
      await waitFor(() => {
        expect(shareFile).toHaveBeenCalledTimes(1);
      });

      // BottomSheet should appear
      await waitFor(() => {
        expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      });
    });

    it('should show BottomSheet immediately if Web Share not supported', async () => {
      // Setup: Android Chrome without Web Share support
      vi.mocked(isMobileDevice).mockReturnValue(true);
      vi.mocked(isAndroidChrome).mockReturnValue(true);
      vi.mocked(canShareFiles).mockReturnValue(false);

      render(<SaveButton scanId={mockScanId} />);

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // BottomSheet should appear immediately
      await waitFor(() => {
        expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      });

      // Web Share should NOT have been attempted
      expect(shareFile).not.toHaveBeenCalled();
    });

    it('should succeed with Web Share on Android Chrome when supported', async () => {
      // Setup: Android Chrome with successful Web Share
      vi.mocked(isMobileDevice).mockReturnValue(true);
      vi.mocked(isAndroidChrome).mockReturnValue(true);
      vi.mocked(canShareFiles).mockReturnValue(true);
      vi.mocked(shareFile).mockResolvedValue(undefined);

      render(<SaveButton scanId={mockScanId} />);

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for success
      await waitFor(() => {
        expect(button).toHaveTextContent('Saved');
      });

      // Web Share should have been attempted
      expect(shareFile).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
    });
  });

  describe('Desktop Behavior Unaffected', () => {
    it('should use desktop download and not show BottomSheet', async () => {
      // Setup: Desktop environment
      vi.mocked(isDesktopEnvironment).mockReturnValue(true);
      vi.mocked(isMobileDevice).mockReturnValue(false);
      vi.mocked(downloadPosterForDesktop).mockResolvedValue(undefined);

      render(<SaveButton scanId={mockScanId} />);

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for success
      await waitFor(() => {
        expect(button).toHaveTextContent('Saved');
      });

      // Desktop download should have been used
      expect(downloadPosterForDesktop).toHaveBeenCalledTimes(1);
      expect(shareFile).not.toHaveBeenCalled();
      expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
    });
  });

  describe('Callback Integration', () => {
    it('should call onFallbackShow when BottomSheet appears', async () => {
      // Setup: Trigger fallback
      const onFallbackShow = vi.fn();
      vi.mocked(shareFile).mockRejectedValue(
        new DOMException('Not allowed', 'NotAllowedError')
      );
      vi.mocked(getErrorType).mockReturnValue('not-allowed');

      render(
        <SaveButton scanId={mockScanId} onFallbackShow={onFallbackShow} />
      );

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for BottomSheet
      await waitFor(() => {
        expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      });

      // Callback should have been called
      expect(onFallbackShow).toHaveBeenCalledTimes(1);
    });

    it('should call onSaveSuccess when save succeeds', async () => {
      // Setup: Successful save
      const onSaveSuccess = vi.fn();
      vi.mocked(shareFile).mockResolvedValue(undefined);

      render(
        <SaveButton scanId={mockScanId} onSaveSuccess={onSaveSuccess} />
      );

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for success
      await waitFor(() => {
        expect(button).toHaveTextContent('Saved');
      });

      // Callback should have been called
      expect(onSaveSuccess).toHaveBeenCalledTimes(1);
    });

    it('should call onSaveFailure on unknown errors and show fallback', async () => {
      // Setup: Unknown error
      const onSaveFailure = vi.fn();
      vi.mocked(shareFile).mockRejectedValue(new Error('Unknown error'));
      vi.mocked(getErrorType).mockReturnValue('unknown');

      render(
        <SaveButton scanId={mockScanId} onSaveFailure={onSaveFailure} />
      );

      // Click save button
      const button = screen.getByRole('button', { name: /save poster/i });
      fireEvent.click(button);

      // Wait for failed state
      await waitFor(() => {
        expect(button).toHaveTextContent('Save Poster');
      });

      // Callback should have been called
      expect(onSaveFailure).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should transition through correct states during failed save', async () => {
      // Setup: Web Share fails
      vi.mocked(shareFile).mockRejectedValue(
        new DOMException('Not allowed', 'NotAllowedError')
      );
      vi.mocked(getErrorType).mockReturnValue('not-allowed');

      render(<SaveButton scanId={mockScanId} />);

      const button = screen.getByRole('button', { name: /save poster/i });

      // Initial state: idle
      expect(button).toHaveTextContent('Save Poster');
      expect(button).not.toBeDisabled();

      // Click: transition to saving
      fireEvent.click(button);
      await waitFor(() => {
        expect(button).toHaveTextContent('Saving...');
      });

      // After error: transition to idle and show BottomSheet
      await waitFor(() => {
        expect(button).toHaveTextContent('Save Poster');
        expect(button).not.toBeDisabled();
      });
      expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
    });

    it('should disable button during saving state', async () => {
      // Setup: Delayed share for testing state
      vi.mocked(shareFile).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<SaveButton scanId={mockScanId} />);

      const button = screen.getByRole('button', { name: /save poster/i });

      // Click button
      fireEvent.click(button);

      // Button should be disabled in saving state
      await waitFor(() => {
        expect(button).toBeDisabled();
      });

      // Wait for completion
      await waitFor(() => {
        expect(button).toHaveTextContent('Saved');
      });

      // Button should be disabled in saved state
      expect(button).toBeDisabled();
    });
  });
});
