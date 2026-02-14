/**
 * SaveButton Component Usage Examples
 * 
 * This file demonstrates how to use the SaveButton component in various scenarios.
 */

import { SaveButton } from "./SaveButton";

/**
 * Example 1: Basic Usage
 * 
 * Simple usage with required props only
 */
export function BasicSaveButtonExample() {
  return (
    <div className="flex items-center gap-4">
      <SaveButton scanId="abc123" />
    </div>
  );
}

/**
 * Example 2: With Success Callback
 * 
 * Using the onSaveSuccess callback to handle successful save operations
 */
export function SaveButtonWithSuccessCallback() {
  const handleSaveSuccess = () => {
    console.log("Poster saved successfully!");
    // Could trigger analytics, show a toast notification, etc.
  };

  return (
    <div className="flex items-center gap-4">
      <SaveButton 
        scanId="abc123" 
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  );
}

/**
 * Example 3: With Both Callbacks
 * 
 * Using both onSaveSuccess and onSaveFailure callbacks
 */
export function SaveButtonWithCallbacks() {
  const handleSaveSuccess = () => {
    console.log("Poster saved successfully!");
    // Update UI, show success toast, etc.
  };

  const handleSaveFailure = () => {
    console.error("Failed to save poster");
    // Show error toast, log error to analytics, etc.
  };

  return (
    <div className="flex items-center gap-4">
      <SaveButton 
        scanId="abc123" 
        onSaveSuccess={handleSaveSuccess}
        onSaveFailure={handleSaveFailure}
      />
    </div>
  );
}

/**
 * Example 4: Multiple Buttons with Different Scan IDs
 * 
 * Managing multiple save buttons for different posters
 */
export function MultipleSaveButtonsExample() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span>Poster 1:</span>
        <SaveButton scanId="scan-001" />
      </div>
      <div className="flex items-center gap-4">
        <span>Poster 2:</span>
        <SaveButton scanId="scan-002" />
      </div>
      <div className="flex items-center gap-4">
        <span>Poster 3:</span>
        <SaveButton scanId="scan-003" />
      </div>
    </div>
  );
}

/**
 * Example 5: Integration with Poster Page
 * 
 * How to use SaveButton in a poster page context
 */
export function PosterPageWithSaveButton({ 
  scanId, 
  imageUrl 
}: { 
  scanId: string;
  imageUrl: string;
}) {
  const handleSaveSuccess = () => {
    // Could show a toast notification
    console.log(`Saved poster for scan ID: ${scanId}`);
  };

  return (
    <div className="poster-container">
      {/* Poster image */}
      <img 
        src={imageUrl} 
        alt={`Security scan poster for ${scanId}`}
        className="poster-image"
      />
      
      {/* Action buttons */}
      <div className="poster-actions">
        <SaveButton 
          scanId={scanId}
          onSaveSuccess={handleSaveSuccess}
        />
        {/* Other action buttons could go here */}
      </div>
    </div>
  );
}

/**
 * Example 6: With Custom Styling Wrapper
 * 
 * Wrapping SaveButton with additional UI elements
 */
export function SaveButtonWithWrapper({ scanId }: { scanId: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Save to Device</h3>
        <p className="text-xs text-slate-600">Download poster as PNG</p>
      </div>
      <SaveButton scanId={scanId} />
    </div>
  );
}

/**
 * Example 7: Tracking Save State in Parent
 * 
 * Parent component tracking save state (for future use)
 * 
 * @note
 * Currently, ButtonState is exported but not exposed via props.
 * This example demonstrates how it could be used in future enhancements.
 */
export function ParentWithStateTracking({ scanId }: { scanId: string }) {
  const handleSaveSuccess = () => {
    console.log("Save operation completed");
    // Could update parent state here
  };

  return (
    <div className="parent-container">
      <SaveButton 
        scanId={scanId}
        onSaveSuccess={handleSaveSuccess}
      />
      {/* Could show additional UI based on save state in future */}
    </div>
  );
}
