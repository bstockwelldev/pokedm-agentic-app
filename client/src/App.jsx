import React, { useState, useEffect } from 'react';

/**
 * PokeDM Chat Application
 * Interacts with the multi-agent backend for Pokémon TTRPG adventures
 */
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);

  // Initialize session on mount
  useEffect(() => {
    // Generate or load session ID from localStorage
    let savedSessionId = localStorage.getItem('pokedm_session_id');
    if (!savedSessionId) {
      savedSessionId = `session_${Date.now()}`;
      localStorage.setItem('pokedm_session_id', savedSessionId);
    }
    setSessionId(savedSessionId);
  }, []);

  // Send message to agent
  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || !sessionId) return;

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

      const data = await response.json();

      if (data.error) {
        setMessages((msgs) => [
          ...msgs,
          { role: 'assistant', content: `Error: ${data.error}` },
        ]);
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
      setMessages((msgs) => [
        ...msgs,
        { role: 'assistant', content: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
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

  // Handle Enter key
  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Get last message with choices
  const lastMessage = messages[messages.length - 1];
  const hasChoices = lastMessage?.choices && lastMessage.choices.length > 0;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1rem' }}>
      <h1>PokeDM - Pokémon TTRPG Adventure</h1>

      {/* Controls */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <label htmlFor="model-select" style={{ marginRight: '0.5rem' }}>
            Model:
          </label>
          <select
            id="model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="gemini-2.5-flash">Google Gemini 2.5 Flash</option>
            <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
            <option value="gemini-1.5-flash">Google Gemini 1.5 Flash</option>
            <option value="gemini-pro">Google Gemini Pro</option>
            <option value="anthropic/claude-opus-4.5">Anthropic Claude Opus</option>
            <option value="xai/grok-4.1-fast-non-reasoning">xAI Grok 4.1 Fast</option>
          </select>
        </div>
        {sessionId && (
          <div style={{ fontSize: '0.9em', color: '#666' }}>
            Session: {sessionId.substring(0, 20)}...
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        {/* Main Chat Area */}
        <div>
          {/* Messages */}
          <div
            style={{
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '1rem',
              height: '400px',
              overflowY: 'auto',
              marginBottom: '1rem',
              backgroundColor: '#f9f9f9',
            }}
          >
            {messages.length === 0 && (
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                Welcome to PokeDM! Start your adventure by describing what you'd like to do.
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  backgroundColor: msg.role === 'user' ? '#e3f2fd' : msg.role === 'system' ? '#fff3e0' : '#f5f5f5',
                  borderRadius: '4px',
                }}
              >
                <strong style={{ color: msg.role === 'user' ? '#1976d2' : msg.role === 'system' ? '#f57c00' : '#666' }}>
                  {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'DM'}:
                </strong>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '0.25rem' }}>
                  {msg.content}
                </div>
                {msg.intent && (
                  <div style={{ fontSize: '0.8em', color: '#999', marginTop: '0.25rem' }}>
                    Intent: {msg.intent}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ color: '#666', fontStyle: 'italic' }}>Thinking…</div>
            )}
          </div>

          {/* Choices */}
          {hasChoices && !loading && (
            <div style={{ marginBottom: '1rem' }}>
              <h3>What would you like to do?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {lastMessage.choices.map((choice, idx) => (
                  <button
                    key={choice.option_id || idx}
                    onClick={() => handleChoiceSelect(choice)}
                    style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#fff')}
                  >
                    <strong>{choice.label}</strong>
                    {choice.description && (
                      <div style={{ fontSize: '0.9em', color: '#666', marginTop: '0.25rem' }}>
                        {choice.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div>
            <textarea
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem' }}
              placeholder="Type your message or action here and press Enter to send"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !sessionId}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Session State Sidebar */}
        <div>
          <h3>Session State</h3>
          <div
            style={{
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '1rem',
              backgroundColor: '#f9f9f9',
              fontSize: '0.9em',
            }}
          >
            {session ? (
              <>
                {session.session?.scene && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Location:</strong> {session.session.scene.location_id || 'Unknown'}
                    <div style={{ fontSize: '0.8em', color: '#666', marginTop: '0.25rem' }}>
                      {session.session.scene.description}
                    </div>
                  </div>
                )}
                {session.characters && session.characters.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Party:</strong>
                    {session.characters.map((char) => (
                      <div key={char.character_id} style={{ marginTop: '0.5rem' }}>
                        <div>{char.trainer.name}</div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>
                          {char.pokemon_party.length} Pokémon
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {session.session?.battle_state?.active && (
                  <div style={{ marginBottom: '1rem', color: '#d32f2f' }}>
                    <strong>⚔️ Battle Active</strong>
                    <div style={{ fontSize: '0.8em' }}>
                      Round: {session.session.battle_state.round}
                    </div>
                  </div>
                )}
                {session.custom_dex && Object.keys(session.custom_dex.pokemon || {}).length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Custom Pokémon:</strong>
                    <div style={{ fontSize: '0.8em', color: '#666' }}>
                      {Object.keys(session.custom_dex.pokemon).length} discovered
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#666' }}>No session data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
