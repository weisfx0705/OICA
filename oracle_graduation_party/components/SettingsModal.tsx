import React, { useEffect, useState } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSave: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSave,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-3xl border-2 border-transparent bg-[linear-gradient(#172521,#172521)_padding-box,linear-gradient(120deg,#ff7aa2,#ffb86b,#ffe66d,#7cf2bd,#69d7ff,#c69cff)_border-box] p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-stone-300 transition-colors hover:text-white"
          title="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="mb-6 text-2xl font-bold text-amber-100">API Settings</h2>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block font-medium text-stone-200">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(event) => setInputKey(event.target.value)}
              placeholder="Paste your API key"
              className="w-full rounded-xl border border-white/15 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-sky-200/70 focus:ring-2 focus:ring-sky-200/20 placeholder:text-stone-600"
            />
            <p className="mt-2 text-sm text-stone-500">
              The key is saved only in this browser's local storage.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <button
              onClick={() => setShowTutorial(!showTutorial)}
              className="font-medium text-sky-100 transition-colors hover:text-amber-100"
            >
              {showTutorial ? "Hide" : "Show"} Google AI Studio key steps
            </button>

            {showTutorial && (
              <div className="mt-4 space-y-3 rounded-xl border border-white/15 bg-stone-950/55 p-4 text-sm text-stone-300">
                <p>Quick setup:</p>
                <ol className="ml-2 list-inside list-decimal space-y-2">
                  <li>
                    Open{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-100 hover:underline"
                    >
                      Google AI Studio
                    </a>{" "}
                    and sign in.
                  </li>
                  <li>Click "Create API key".</li>
                  <li>Create a key, copy it, and paste it here.</li>
                </ol>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="rounded-full border border-white/15 px-6 py-2 text-stone-200 transition-colors hover:bg-stone-900"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave(inputKey);
                onClose();
              }}
              className="rounded-full bg-[linear-gradient(90deg,#ff7aa2,#ffb86b,#ffe66d,#7cf2bd,#69d7ff)] px-6 py-2 font-bold text-stone-950 shadow-lg shadow-amber-500/10 transition hover:scale-[1.02]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
