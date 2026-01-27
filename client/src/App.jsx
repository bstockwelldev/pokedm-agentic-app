import React, { useState, useEffect } from 'react';
import ErrorBanner from './components/ErrorBanner';
import DiagnosticsDrawer from './components/DiagnosticsDrawer';
import ExportDrawer from './components/ExportDrawer';
import ImportDrawer from './components/ImportDrawer';
import AppShell from './components/AppShell';
import TopBar from './components/TopBar';
import ChatTimeline from './components/ChatTimeline';
import Composer from './components/Composer';
import RightPanel from './components/RightPanel';
import { renderMessage } from './lib/messageMapper';
import { cn } from './lib/utils';

/**
 * PokeDM Chat Application
 * Interacts with the multi-agent backend for Pokémon TTRPG adventures
 */
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [focusedChoiceIndex, setFocusedChoiceIndex] = useState(-1);
  const [error, setError] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showExportDrawer, setShowExportDrawer] = useState(false);
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [lastRequest, setLastRequest] = useState(null);

  // Compute derived state for choices (must be before functions/hooks that use it)
  const lastMessage = messages[messages.length - 1];
  const hasChoices = lastMessage?.choices && lastMessage.choices.length > 0;

  // Initialize session and fetch models on mount
  useEffect(() => {
    // Generate or load session ID from localStorage
    let savedSessionId = localStorage.getItem('pokedm_session_id');
    if (!savedSessionId) {
      savedSessionId = `session_${Date.now()}`;
      localStorage.setItem('pokedm_session_id', savedSessionId);
    }
    setSessionId(savedSessionId);

    // Fetch available models
    async function fetchModels() {
      try {
        const response = await fetch('/api/models');
        if (response.ok) {
          const data = await response.json();
          const models = data.models || [];
          const groqModels = models.filter(m => m.provider === 'groq');
          const geminiModels = models.filter(m => m.provider === 'google');
          console.log(`[CLIENT] Fetched ${models.length} models: ${geminiModels.length} Gemini, ${groqModels.length} Groq`);
          console.log('[CLIENT] All model IDs:', models.map(m => m.id).join(', '));
          console.log('[CLIENT] Groq model IDs:', groqModels.map(m => m.id).join(', '));
          
          // Filter and normalize models
          const filteredModels = filterValidModels(models);
          console.log(`[CLIENT] Filtered to ${filteredModels.length} valid models`);
          
          setAvailableModels(filteredModels.length > 0 ? filteredModels : models);
          // Set default model if available
          if (filteredModels.length > 0) {
            const defaultModel = filteredModels.find((m) => m.id === 'gemini-2.5-flash') || filteredModels[0];
            setModel(defaultModel.id);
          } else if (models.length > 0) {
            const defaultModel = models.find((m) => m.id === 'gemini-2.5-flash') || models[0];
            const normalized = normalizeModelName(defaultModel.id);
            setModel(normalized || defaultModel.id);
          }
        } else {
          console.error('[CLIENT] Failed to fetch models:', response.status, response.statusText);
          // Fallback to known models including Groq
          const fallbackModels = [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
            { id: 'groq/llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Groq)', provider: 'groq' },
            { id: 'groq/llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile (Groq)', provider: 'groq' },
            { id: 'groq/llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Groq)', provider: 'groq' },
            { id: 'groq/mixtral-8x7b-32768', name: 'Mixtral 8x7B 32K (Groq)', provider: 'groq' },
            { id: 'groq/llama-3.2-90b-text-preview', name: 'Llama 3.2 90B Text Preview (Groq)', provider: 'groq' },
            { id: 'groq/llama-3.2-11b-text-preview', name: 'Llama 3.2 11B Text Preview (Groq)', provider: 'groq' },
          ];
          console.log(`[CLIENT] Using fallback models: ${fallbackModels.length} total`);
          setAvailableModels(fallbackModels);
        }
      } catch (err) {
        console.error('[CLIENT] Failed to fetch models:', err);
        // Fallback to known models including Groq
        const fallbackModels = [
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
          { id: 'groq/llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Groq)', provider: 'groq' },
          { id: 'groq/llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile (Groq)', provider: 'groq' },
          { id: 'groq/llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Groq)', provider: 'groq' },
          { id: 'groq/mixtral-8x7b-32768', name: 'Mixtral 8x7B 32K (Groq)', provider: 'groq' },
          { id: 'groq/llama-3.2-90b-text-preview', name: 'Llama 3.2 90B Text Preview (Groq)', provider: 'groq' },
          { id: 'groq/llama-3.2-11b-text-preview', name: 'Llama 3.2 11B Text Preview (Groq)', provider: 'groq' },
        ];
        console.log(`[CLIENT] Using fallback models: ${fallbackModels.length} total`);
        setAvailableModels(fallbackModels);
      }
    }
    fetchModels();
  }, []);

  // Send message to agent
  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || !sessionId) return;

    // Clear any previous errors
    setError(null);
    setShowDiagnostics(false);

    // Store request for retry functionality
    const requestParams = { userInput: trimmed, sessionId, model };
    setLastRequest(requestParams);

    // Add user's message to chat history
    setMessages((msgs) => [
      ...msgs,
      { role: 'user', content: trimmed },
    ]);
    setLoading(true);
    setInput('');

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: trimmed,
          sessionId: sessionId,
          model: model,
        }),
      });

      // Check if response is OK and is JSON
      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { error: `Server error: ${response.status} ${response.statusText}`, details: text.substring(0, 200) };
        }
        
        // Extract request ID from headers if available
        const requestId = response.headers.get('X-Request-ID') || errorData.requestId;
        
        // Enhanced error handling for rate limiting and model errors
        const isRateLimit = response.status === 429 || 
                           errorData.errorType === 'rate_limit' ||
                           errorData.error?.toLowerCase().includes('rate limit') ||
                           errorData.details?.toLowerCase().includes('quota exceeded');
        const isModelError = errorData.errorType === 'model_not_found' ||
                            errorData.error?.toLowerCase().includes('model') && errorData.error?.toLowerCase().includes('not found');
        
        // Use user-friendly message if available
        const userMessage = errorData.userMessage || errorData.error || errorData.details || `HTTP ${response.status}`;
        
        setError({
          message: isRateLimit 
            ? (errorData.userMessage || 'Rate limit exceeded - Please try again in a moment or switch to a different model')
            : isModelError
            ? (errorData.userMessage || 'Invalid model name - Please select a different model')
            : userMessage,
          details: isRateLimit
            ? (errorData.details || 'The AI provider has temporarily limited requests. Try switching to a different model or wait a few moments.')
            : isModelError
            ? (errorData.details || `Model "${model}" is not available. Please select a different model from the dropdown.`)
            : errorData.details,
          requestId: requestId,
          timestamp: errorData.timestamp || new Date().toISOString(),
          endpoint: errorData.endpoint || '/api/agent',
          method: 'POST',
          statusCode: response.status,
          stack: errorData.stack,
          retryAfter: errorData.retryAfter,
          errorType: errorData.errorType,
          availableModels: errorData.availableModels,
        });
        setLoading(false);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        const requestId = response.headers.get('X-Request-ID');
        setError({
          message: `Expected JSON but got ${contentType}`,
          details: text.substring(0, 200),
          requestId: requestId,
          timestamp: new Date().toISOString(),
          endpoint: '/api/agent',
          method: 'POST',
          statusCode: response.status,
        });
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.error) {
        // Extract request ID from response headers or error data
        const requestId = response.headers.get('X-Request-ID') || data.requestId;
        setError({
          message: data.error,
          details: data.details,
          requestId: requestId,
          timestamp: data.timestamp || new Date().toISOString(),
          endpoint: data.endpoint || '/api/agent',
          method: 'POST',
          statusCode: response.status,
          stack: data.stack,
        });
        setLoading(false);
        return;
      } else {
        // Update session ID if provided
        if (data.sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem('pokedm_session_id', data.sessionId);
        }

        // Update session state
        if (data.session) {
          setSession(data.session);
        }

        // Add narration
        if (data.narration) {
          setMessages((msgs) => [
            ...msgs,
            {
              role: 'assistant',
              content: data.narration,
              intent: data.intent,
              choices: data.choices || [],
              steps: data.steps || [], // Store tool execution steps
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        // Show custom Pokémon if created
        if (data.customPokemon) {
          setMessages((msgs) => [
            ...msgs,
            {
              role: 'system',
              content: `✨ New Custom Pokémon Created: ${data.customPokemon.display_name} (${data.customPokemon.custom_species_id})`,
            },
          ]);
        }
      }
    } catch (err) {
      // Network errors or other exceptions
      setError({
        message: err.message || 'An unexpected error occurred',
        details: err.stack,
        requestId: null,
        timestamp: new Date().toISOString(),
        endpoint: '/api/agent',
        method: 'POST',
        statusCode: null,
        stack: err.stack,
      });
    } finally {
      setLoading(false);
    }
  }

  // Retry last request
  function retryLastRequest() {
    if (lastRequest) {
      setError(null);
      setShowDiagnostics(false);
      setInput(lastRequest.userInput);
      // Use setTimeout to ensure state updates before calling sendMessage
      setTimeout(() => {
        sendMessage();
      }, 0);
    }
  }

  // Handle diagnostics drawer
  function handleShowDiagnostics() {
    setShowDiagnostics(true);
  }

  function handleCloseDiagnostics() {
    setShowDiagnostics(false);
  }

  function handleDismissError() {
    setError(null);
    setShowDiagnostics(false);
  }

  // Handle import success
  function handleImportSuccess(result) {
    // Update session ID and session state
    if (result.sessionId) {
      setSessionId(result.sessionId);
      localStorage.setItem('pokedm_session_id', result.sessionId);
    }
    
    if (result.session) {
      setSession(result.session);
    }

    // Load messages if they were imported
    if (result.imported_components?.includes('messages') && result.messages && Array.isArray(result.messages)) {
      setMessages(result.messages);
    } else if (result.imported_components?.includes('messages')) {
      // If messages were requested but not provided, clear messages
      setMessages([]);
    }

    // Clear any errors
    setError(null);
  }

  // Handle choice selection
  function handleChoiceSelect(choice) {
    setSelectedChoice(choice);
    // Send the choice label as user input
    const choiceText = choice.description || choice.label;
    setInput(choiceText);
    // Note: Don't call sendMessage() here - let user press Send or Enter
    // This allows them to modify the choice if needed
  }

  // Handle keyboard navigation for choices
  function handleChoiceKeyDown(e, choice, index) {
    if (!hasChoices || !lastMessage.choices) return;

    const choices = lastMessage.choices;
    let newIndex = focusedChoiceIndex;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        newIndex = index < choices.length - 1 ? index + 1 : 0;
        setFocusedChoiceIndex(newIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newIndex = index > 0 ? index - 1 : choices.length - 1;
        setFocusedChoiceIndex(newIndex);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleChoiceSelect(choice);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedChoiceIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedChoiceIndex(choices.length - 1);
        break;
      default:
        break;
    }
  }

  // Reset focused choice index when choices change
  useEffect(() => {
    if (hasChoices) {
      setFocusedChoiceIndex(0);
    } else {
      setFocusedChoiceIndex(-1);
    }
  }, [hasChoices]);

  // Handle Enter key
  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <AppShell>
      {/* Status announcements for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {loading && 'Thinking...'}
        {hasChoices && !loading && `${lastMessage.choices.length} choices available. Use arrow keys to navigate.`}
      </div>

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          error={error.message}
          details={error.details}
          requestId={error.requestId}
          statusCode={error.statusCode}
          timestamp={error.timestamp}
          endpoint={error.endpoint}
          retryAfter={error.retryAfter}
          errorType={error.errorType}
          availableModels={error.availableModels}
          onRetry={retryLastRequest}
          onDismiss={handleDismissError}
          onCopyDiagnostics={handleShowDiagnostics}
        />
      )}

      {/* Diagnostics Drawer */}
      <DiagnosticsDrawer
        isOpen={showDiagnostics}
        onClose={handleCloseDiagnostics}
        diagnostics={error || {}}
      />

      {/* Export Drawer */}
      <ExportDrawer
        isOpen={showExportDrawer}
        onClose={() => setShowExportDrawer(false)}
        session={session}
        messages={messages}
      />

      {/* Import Drawer */}
      <ImportDrawer
        isOpen={showImportDrawer}
        onClose={() => setShowImportDrawer(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Top Bar */}
      <TopBar
        model={model}
        onModelChange={setModel}
        availableModels={availableModels}
        sessionId={sessionId}
        onExportClick={() => setShowExportDrawer(true)}
        onImportClick={() => setShowImportDrawer(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[2fr_1fr] overflow-hidden min-h-0">
        {/* Chat Area */}
        <div className="flex flex-col overflow-hidden min-h-0">
          {/* Chat Timeline */}
          <div className="flex-1 overflow-hidden p-4 min-h-0">
            <ChatTimeline messages={messages} loading={loading}>
            {messages.map((msg, idx) =>
              renderMessage(msg, idx, {
                onChoiceSelect: handleChoiceSelect,
                onChoiceKeyDown: handleChoiceKeyDown,
                focusedChoiceIndex: focusedChoiceIndex,
                setFocusedChoiceIndex: setFocusedChoiceIndex,
              })
            )}
          </ChatTimeline>
          </div>

          {/* Composer */}
          <Composer
            input={input}
            onInputChange={setInput}
            onSend={sendMessage}
            onKeyDown={handleKeyPress}
            loading={loading}
            disabled={!sessionId}
          />
        </div>

        {/* Right Panel */}
        <RightPanel session={session} messages={messages} />
      </div>
    </AppShell>
  );
}
