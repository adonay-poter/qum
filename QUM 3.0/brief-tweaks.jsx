// brief-tweaks.jsx
// Wires the QUM Brief to the TweaksPanel shell.
// Each tweak mutates a body data-attribute; CSS does the heavy lifting.

(function () {
  const { useEffect } = React;

  function applyTweaks(t) {
    document.body.dataset.density   = t.density;
    document.body.dataset.tone      = t.tone;
    document.body.dataset.emoji     = t.emoji ? 'on' : 'off';
    document.body.dataset.citations = t.citations ? 'on' : 'off';
    document.body.dataset.motion    = t.motion ? 'on' : 'off';
  }

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    useEffect(() => { applyTweaks(t); }, [t]);

    return (
      <TweaksPanel title="Tweaks">
        <TweakSection label="Reading" />
        <TweakRadio  label="Density" value={t.density}
                     options={[{ value: 'exec',   label: 'Exec' },
                               { value: 'detail', label: 'Detail' }]}
                     onChange={(v) => setTweak('density', v)} />
        <TweakRadio  label="Wording" value={t.tone}
                     options={[{ value: 'lay',      label: 'Plain' },
                               { value: 'clinical', label: 'Clinical' }]}
                     onChange={(v) => setTweak('tone', v)} />

        <TweakSection label="Show" />
        <TweakToggle label="Emoji callouts"  value={t.emoji}
                     onChange={(v) => setTweak('emoji', v)} />
        <TweakToggle label="Citation markers" value={t.citations}
                     onChange={(v) => setTweak('citations', v)} />

        <TweakSection label="Motion" />
        <TweakToggle label="Animate diagrams" value={t.motion}
                     onChange={(v) => setTweak('motion', v)} />
      </TweaksPanel>
    );
  }

  // Apply defaults immediately so the page renders right on first paint, even
  // before React mounts and the user opens Tweaks.
  applyTweaks(TWEAK_DEFAULTS);

  const mount = document.createElement('div');
  document.body.appendChild(mount);
  ReactDOM.createRoot(mount).render(<App />);
})();
